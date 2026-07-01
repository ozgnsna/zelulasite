import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";
import { fetchTrendyolOrdersForSync } from "@/lib/marketplaces/trendyol/orders";
import { fetchTrendyolStockByBarcodeSnapshot } from "@/lib/marketplaces/trendyol/products";
import { getActiveTrendyolIntegration, logMarketplaceSync } from "@/lib/marketplaces/trendyol/client";

type LinkedProduct = {
  id: string;
  stock_quantity: number | null;
  is_active: boolean | null;
  trendyol_active: boolean | null;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  sku: string | null;
};

export type DailyStockReconcileResult =
  | {
      ok: true;
      skipped?: false;
      orderLookbackDays: number;
      ordersFetched: number;
      orderStockUpdates: number;
      orderUnmatched: number;
      ordersSkipped?: boolean;
      ordersError?: string | null;
      trendyolRowsRead: number;
      stockAdjusted: number;
      siteDeactivated: number;
      pushedToTrendyol: number;
      skippedNotInTrendyolFeed: number;
    }
  | { ok: true; skipped: true }
  | { ok: false; message: string };

async function logDailyReconcileRun(
  admin: SupabaseClient,
  params: {
    integrationId: string | null;
    status: "success" | "error" | "skipped";
    message: string;
    affectedCount?: number;
    errorMessage?: string | null;
    responsePayload?: Record<string, unknown>;
  },
) {
  const ranAt = new Date().toISOString();
  await logMarketplaceSync(admin, {
    integrationId: params.integrationId,
    entityType: "inventory",
    action: "daily_stock_reconcile",
    status: params.status,
    message: params.message,
    responsePayload: params.responsePayload ?? null,
    metadata: {
      ran_at: ranAt,
      affected_count: params.affectedCount ?? 0,
      error_message: params.errorMessage ?? null,
    },
  });
}

/**
 * Günlük stok eşitleme (Trendyol = kaynak):
 * 1) Son N gün Trendyol siparişlerini işle (opsiyonel — hata olursa atla, devam et)
 * 2) Trendyol API stok snapshot'ı ile eşleşen ürünlerde site stoğu = TY stoğu
 * 3) Trendyol'a açık ürünlerde güncel stoku gönder
 */
export async function reconcileDailyStockWithTrendyol(
  admin: SupabaseClient,
  opts?: { orderLookbackDays?: number },
): Promise<DailyStockReconcileResult> {
  const orderLookbackDays = Math.min(7, Math.max(1, Math.trunc(opts?.orderLookbackDays ?? 1)));
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration) {
    await logDailyReconcileRun(admin, {
      integrationId: null,
      status: "skipped",
      message: "Trendyol entegrasyonu aktif değil; günlük reconcile atlandı.",
      affectedCount: 0,
    });
    return { ok: true, skipped: true };
  }

  const startDate = new Date(Date.now() - orderLookbackDays * 24 * 60 * 60 * 1000);
  const orderResult = await fetchTrendyolOrdersForSync(admin, { startDate, endDate: new Date() });

  let ordersFetched = 0;
  let orderStockUpdates = 0;
  let orderUnmatched = 0;
  let ordersSkipped = false;
  let ordersError: string | null = null;

  if (!orderResult.ok) {
    ordersSkipped = true;
    ordersError = orderResult.message ?? "Trendyol siparişleri işlenemedi.";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "order",
      action: "daily_stock_reconcile_orders_skip",
      status: "skipped",
      message: `Sipariş adımı atlandı, stok snapshot devam ediyor: ${ordersError}`,
      metadata: {
        ran_at: new Date().toISOString(),
        error_message: ordersError,
      },
    });
  } else if ("skipped" in orderResult && orderResult.skipped) {
    ordersSkipped = true;
  } else {
    ordersFetched = orderResult.orders.length;
    orderStockUpdates = orderResult.updatedProducts;
    orderUnmatched = orderResult.unmatchedProducts;
  }

  const snapshot = await fetchTrendyolStockByBarcodeSnapshot(admin);
  if (!snapshot.ok) {
    if ("skipped" in snapshot && snapshot.skipped) {
      await logDailyReconcileRun(admin, {
        integrationId: integration.id,
        status: "skipped",
        message: "Trendyol stok snapshot atlandı (kimlik bilgisi yok).",
        errorMessage: null,
      });
      return { ok: true, skipped: true };
    }
    const message = "message" in snapshot ? snapshot.message : "Trendyol stok okunamadı.";
    await logDailyReconcileRun(admin, {
      integrationId: integration.id,
      status: "error",
      message: `Günlük stok eşitleme başarısız: ${message}`,
      errorMessage: message,
      responsePayload: { ordersSkipped, ordersError, ordersFetched },
    });
    return { ok: false, message };
  }

  const { data: linkedRows } = await admin
    .from("products")
    .select("id,stock_quantity,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,sku")
    .or("trendyol_barcode.not.is.null,trendyol_stock_code.not.is.null,sku.not.is.null");

  let stockAdjusted = 0;
  let siteDeactivated = 0;
  let skippedNotInTrendyolFeed = 0;
  const pushIds: string[] = [];

  for (const row of (linkedRows ?? []) as LinkedProduct[]) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    const matchKey = [row.trendyol_barcode, row.trendyol_stock_code, row.sku]
      .map((v) => String(v ?? "").trim())
      .find((c) => c && snapshot.stockByBarcode.has(c));
    if (!matchKey) {
      skippedNotInTrendyolFeed += 1;
      continue;
    }

    const tyStock = snapshot.stockByBarcode.get(matchKey) ?? 0;
    const zelulaStock = Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0)));
    const target = tyStock;
    const wasActive = Boolean(row.is_active);
    const willBeActive = target > 0;
    const needsUpdate = target !== zelulaStock || willBeActive !== wasActive;

    if (needsUpdate) {
      await admin
        .from("products")
        .update({
          stock_quantity: target,
          is_active: willBeActive,
        })
        .eq("id", id);
      stockAdjusted += 1;
      if (target === 0) siteDeactivated += 1;
    }

    if (Boolean(row.trendyol_active)) {
      pushIds.push(id);
    }
  }

  const pushResult = await syncPriceInventoryForProducts(admin, [...new Set(pushIds)], "daily_stock_reconcile");
  const pushedToTrendyol = pushResult.ok && !pushResult.skipped ? (pushResult.count ?? 0) : 0;

  const summaryPayload = {
    orderLookbackDays,
    ordersFetched,
    orderStockUpdates,
    orderUnmatched,
    ordersSkipped,
    ordersError,
    trendyolRowsRead: snapshot.fetchedCount,
    stockAdjusted,
    siteDeactivated,
    pushedToTrendyol,
    skippedNotInTrendyolFeed,
  };

  if (!pushResult.ok && pushResult.message) {
    await logDailyReconcileRun(admin, {
      integrationId: integration.id,
      status: "error",
      message: `Günlük stok eşitleme push başarısız: ${pushResult.message}`,
      affectedCount: pushedToTrendyol,
      errorMessage: pushResult.message,
      responsePayload: summaryPayload,
    });
    return { ok: false, message: pushResult.message };
  }

  const affectedCount = stockAdjusted + pushedToTrendyol;
  await logDailyReconcileRun(admin, {
    integrationId: integration.id,
    status: "success",
    message: `Günlük stok eşitleme: ${stockAdjusted} ürün güncellendi, ${pushedToTrendyol} ürün Trendyol'a gönderildi.${ordersSkipped ? " (Sipariş adımı atlandı.)" : ""}`,
    affectedCount,
    errorMessage: ordersError,
    responsePayload: summaryPayload,
  });

  return {
    ok: true,
    orderLookbackDays,
    ordersFetched,
    orderStockUpdates,
    orderUnmatched,
    ordersSkipped,
    ordersError,
    trendyolRowsRead: snapshot.fetchedCount,
    stockAdjusted,
    siteDeactivated,
    pushedToTrendyol,
    skippedNotInTrendyolFeed,
  };
}
