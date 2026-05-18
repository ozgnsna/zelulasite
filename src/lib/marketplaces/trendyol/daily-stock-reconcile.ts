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
};

export type DailyStockReconcileResult =
  | {
      ok: true;
      skipped?: false;
      orderLookbackDays: number;
      ordersFetched: number;
      orderStockUpdates: number;
      orderUnmatched: number;
      trendyolRowsRead: number;
      stockAdjusted: number;
      siteDeactivated: number;
      pushedToTrendyol: number;
      skippedNotInTrendyolFeed: number;
    }
  | { ok: true; skipped: true }
  | { ok: false; message: string };

/**
 * Günlük stok eşitleme:
 * 1) Son N gün Trendyol siparişlerini işle (Zelula stok düş)
 * 2) Trendyol API stok snapshot'ı ile barkod eşleşen ürünlerde hedef = min(Zelula, TY)
 * 3) Trendyol'a açık ürünlerde güncel stoku gönder
 */
export async function reconcileDailyStockWithTrendyol(
  admin: SupabaseClient,
  opts?: { orderLookbackDays?: number },
): Promise<DailyStockReconcileResult> {
  const orderLookbackDays = Math.min(7, Math.max(1, Math.trunc(opts?.orderLookbackDays ?? 1)));
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration) {
    return { ok: true, skipped: true };
  }

  const startDate = new Date(Date.now() - orderLookbackDays * 24 * 60 * 60 * 1000);
  const orderResult = await fetchTrendyolOrdersForSync(admin, { startDate, endDate: new Date() });
  if (!orderResult.ok) {
    return { ok: false, message: orderResult.message ?? "Trendyol siparişleri işlenemedi." };
  }

  const snapshot = await fetchTrendyolStockByBarcodeSnapshot(admin);
  if (!snapshot.ok) {
    if ("skipped" in snapshot && snapshot.skipped) return { ok: true, skipped: true };
    return { ok: false, message: "message" in snapshot ? snapshot.message : "Trendyol stok okunamadı." };
  }

  const { data: linkedRows } = await admin
    .from("products")
    .select("id,stock_quantity,is_active,trendyol_active,trendyol_barcode")
    .not("trendyol_barcode", "is", null);

  let stockAdjusted = 0;
  let siteDeactivated = 0;
  let skippedNotInTrendyolFeed = 0;
  const pushIds: string[] = [];

  for (const row of (linkedRows ?? []) as LinkedProduct[]) {
    const id = String(row.id ?? "").trim();
    const barcode = String(row.trendyol_barcode ?? "").trim();
    if (!id || !barcode) continue;

    if (!snapshot.stockByBarcode.has(barcode)) {
      skippedNotInTrendyolFeed += 1;
      continue;
    }

    const tyStock = snapshot.stockByBarcode.get(barcode) ?? 0;
    const zelulaStock = Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0)));
    const target = Math.min(zelulaStock, tyStock);
    const wasActive = Boolean(row.is_active);
    const needsUpdate = target !== zelulaStock || (target === 0 && wasActive);

    if (needsUpdate) {
      await admin
        .from("products")
        .update({
          stock_quantity: target,
          is_active: target > 0,
        })
        .eq("id", id);
      stockAdjusted += 1;
      if (target === 0) siteDeactivated += 1;
    }

    if (Boolean(row.trendyol_active) && barcode) {
      pushIds.push(id);
    }
  }

  const pushResult = await syncPriceInventoryForProducts(admin, [...new Set(pushIds)], "daily_stock_reconcile");
  const pushedToTrendyol = pushResult.ok && !pushResult.skipped ? (pushResult.count ?? 0) : 0;

  if (!pushResult.ok && pushResult.message) {
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "inventory",
      action: "daily_stock_reconcile",
      status: "error",
      message: pushResult.message,
    });
    return { ok: false, message: pushResult.message };
  }

  await logMarketplaceSync(admin, {
    integrationId: integration.id,
    entityType: "inventory",
    action: "daily_stock_reconcile",
    status: "success",
    message: `Günlük stok eşitleme: ${stockAdjusted} ürün güncellendi, ${pushedToTrendyol} ürün Trendyol'a gönderildi.`,
    responsePayload: {
      orderLookbackDays,
      ordersFetched: orderResult.orders.length,
      orderStockUpdates: orderResult.updatedProducts,
      orderUnmatched: orderResult.unmatchedProducts,
      trendyolRowsRead: snapshot.fetchedCount,
      stockAdjusted,
      siteDeactivated,
      pushedToTrendyol,
      skippedNotInTrendyolFeed,
    },
  });

  return {
    ok: true,
    orderLookbackDays,
    ordersFetched: orderResult.orders.length,
    orderStockUpdates: orderResult.updatedProducts,
    orderUnmatched: orderResult.unmatchedProducts,
    trendyolRowsRead: snapshot.fetchedCount,
    stockAdjusted,
    siteDeactivated,
    pushedToTrendyol,
    skippedNotInTrendyolFeed,
  };
}
