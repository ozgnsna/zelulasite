import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTrendyolOrdersForSync } from "@/lib/marketplaces/trendyol/orders";
import { getActiveTrendyolIntegration, logMarketplaceSync } from "@/lib/marketplaces/trendyol/client";

export type TrendyolInboundSyncResult =
  | {
      ok: true;
      skipped?: false;
      orderLookbackDays: number;
      ordersFetched: number;
      orderStockUpdates: number;
      orderUnmatched: number;
      duplicateSkipped: number;
      restoredOrders: number;
      ordersSkipped?: boolean;
      ordersError?: string | null;
    }
  | { ok: true; skipped: true }
  | { ok: false; message: string };

/** @deprecated Eski tip adı — yeni kod TrendyolInboundSyncResult kullanmalı. */
export type DailyStockReconcileResult = TrendyolInboundSyncResult;

async function logInboundSyncRun(
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
    entityType: "order",
    action: "inbound_orders_sync",
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
 * Site = stok master. Yalnızca Trendyol siparişlerini çeker ve site stoğunu günceller.
 * Trendyol API stok snapshot'ı site stoğuna ASLA yazılmaz.
 */
export async function syncTrendyolInboundOrders(
  admin: SupabaseClient,
  opts?: { orderLookbackDays?: number },
): Promise<TrendyolInboundSyncResult> {
  const orderLookbackDays = Math.min(7, Math.max(1, Math.trunc(opts?.orderLookbackDays ?? 1)));
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration) {
    await logInboundSyncRun(admin, {
      integrationId: null,
      status: "skipped",
      message: "Trendyol entegrasyonu aktif değil; inbound sipariş senkronu atlandı.",
      affectedCount: 0,
    });
    return { ok: true, skipped: true };
  }

  const startDate = new Date(Date.now() - orderLookbackDays * 24 * 60 * 60 * 1000);
  const orderResult = await fetchTrendyolOrdersForSync(admin, { startDate, endDate: new Date() });

  if (!orderResult.ok) {
    const ordersError = orderResult.message ?? "Trendyol siparişleri işlenemedi.";
    await logInboundSyncRun(admin, {
      integrationId: integration.id,
      status: "error",
      message: `Inbound sipariş senkronu başarısız: ${ordersError}`,
      errorMessage: ordersError,
      responsePayload: { orderLookbackDays },
    });
    return { ok: false, message: ordersError };
  }

  if ("skipped" in orderResult && orderResult.skipped) {
    await logInboundSyncRun(admin, {
      integrationId: integration.id,
      status: "skipped",
      message: "Trendyol kimlik bilgisi eksik; inbound sipariş senkronu atlandı.",
      affectedCount: 0,
    });
    return { ok: true, skipped: true };
  }

  const summaryPayload = {
    orderLookbackDays,
    ordersFetched: orderResult.orders.length,
    orderStockUpdates: orderResult.updatedProducts,
    orderUnmatched: orderResult.unmatchedProducts,
    duplicateSkipped: orderResult.duplicateSkipped,
    restoredOrders: orderResult.restoredOrders,
  };

  await logInboundSyncRun(admin, {
    integrationId: integration.id,
    status: "success",
    message: `${orderResult.orders.length} Trendyol sipariş kaydı işlendi; ${orderResult.updatedProducts} ürün stoğu güncellendi.`,
    affectedCount: orderResult.updatedProducts,
    responsePayload: summaryPayload,
  });

  return {
    ok: true,
    orderLookbackDays,
    ordersFetched: orderResult.orders.length,
    orderStockUpdates: orderResult.updatedProducts,
    orderUnmatched: orderResult.unmatchedProducts,
    duplicateSkipped: orderResult.duplicateSkipped,
    restoredOrders: orderResult.restoredOrders,
  };
}

/** @deprecated syncTrendyolInboundOrders kullanın. */
export const reconcileDailyStockWithTrendyol = syncTrendyolInboundOrders;
