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
      started_at?: string;
      finished_at?: string;
      duration_ms?: number;
    }
  | { ok: true; skipped: true; started_at?: string; finished_at?: string; duration_ms?: number }
  | { ok: false; message: string; started_at?: string; finished_at?: string; duration_ms?: number };

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
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    ordersFetched?: number;
    stockLinesUpdated?: number;
    unmatchedLines?: number;
    duplicateSkipped?: number;
    restoredOrders?: number;
  },
) {
  await logMarketplaceSync(admin, {
    integrationId: params.integrationId,
    entityType: "order",
    action: "inbound_orders_sync",
    status: params.status,
    message: params.message,
    responsePayload: params.responsePayload ?? null,
    metadata: {
      started_at: params.startedAt,
      finished_at: params.finishedAt,
      duration_ms: params.durationMs,
      ran_at: params.finishedAt,
      affected_count: params.affectedCount ?? 0,
      error_message: params.errorMessage ?? null,
      orders_fetched: params.ordersFetched ?? 0,
      stock_lines_updated: params.stockLinesUpdated ?? params.affectedCount ?? 0,
      unmatched_lines: params.unmatchedLines ?? 0,
      duplicate_skipped: params.duplicateSkipped ?? 0,
      restored_orders: params.restoredOrders ?? 0,
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
  const startedAt = new Date();
  const startedIso = startedAt.toISOString();
  const finish = () => {
    const finishedAt = new Date();
    return {
      finished_at: finishedAt.toISOString(),
      duration_ms: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    };
  };

  const orderLookbackDays = Math.min(7, Math.max(1, Math.trunc(opts?.orderLookbackDays ?? 1)));
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration) {
    const timing = finish();
    await logInboundSyncRun(admin, {
      integrationId: null,
      status: "skipped",
      message: "Trendyol entegrasyonu aktif değil; inbound sipariş senkronu atlandı.",
      affectedCount: 0,
      startedAt: startedIso,
      finishedAt: timing.finished_at,
      durationMs: timing.duration_ms,
    });
    return { ok: true, skipped: true, started_at: startedIso, ...timing };
  }

  const startDate = new Date(Date.now() - orderLookbackDays * 24 * 60 * 60 * 1000);
  const orderResult = await fetchTrendyolOrdersForSync(admin, { startDate, endDate: new Date() });

  if (!orderResult.ok) {
    const ordersError = orderResult.message ?? "Trendyol siparişleri işlenemedi.";
    const timing = finish();
    await logInboundSyncRun(admin, {
      integrationId: integration.id,
      status: "error",
      message: `Inbound sipariş senkronu başarısız: ${ordersError}`,
      errorMessage: ordersError,
      responsePayload: { orderLookbackDays },
      startedAt: startedIso,
      finishedAt: timing.finished_at,
      durationMs: timing.duration_ms,
    });
    return { ok: false, message: ordersError, started_at: startedIso, ...timing };
  }

  if ("skipped" in orderResult && orderResult.skipped) {
    const timing = finish();
    await logInboundSyncRun(admin, {
      integrationId: integration.id,
      status: "skipped",
      message: "Trendyol kimlik bilgisi eksik; inbound sipariş senkronu atlandı.",
      affectedCount: 0,
      startedAt: startedIso,
      finishedAt: timing.finished_at,
      durationMs: timing.duration_ms,
    });
    return { ok: true, skipped: true, started_at: startedIso, ...timing };
  }

  const summaryPayload = {
    orderLookbackDays,
    ordersFetched: orderResult.orders.length,
    orderStockUpdates: orderResult.updatedProducts,
    orderUnmatched: orderResult.unmatchedProducts,
    duplicateSkipped: orderResult.duplicateSkipped,
    restoredOrders: orderResult.restoredOrders,
  };

  const timing = finish();
  await logInboundSyncRun(admin, {
    integrationId: integration.id,
    status: "success",
    message: `${orderResult.orders.length} Trendyol sipariş kaydı işlendi; ${orderResult.updatedProducts} ürün stoğu güncellendi.`,
    affectedCount: orderResult.updatedProducts,
    responsePayload: summaryPayload,
    startedAt: startedIso,
    finishedAt: timing.finished_at,
    durationMs: timing.duration_ms,
    ordersFetched: orderResult.orders.length,
    stockLinesUpdated: orderResult.updatedProducts,
    unmatchedLines: orderResult.unmatchedProducts,
    duplicateSkipped: orderResult.duplicateSkipped,
    restoredOrders: orderResult.restoredOrders,
  });

  return {
    ok: true,
    orderLookbackDays,
    ordersFetched: orderResult.orders.length,
    orderStockUpdates: orderResult.updatedProducts,
    orderUnmatched: orderResult.unmatchedProducts,
    duplicateSkipped: orderResult.duplicateSkipped,
    restoredOrders: orderResult.restoredOrders,
    started_at: startedIso,
    ...timing,
  };
}

/** @deprecated syncTrendyolInboundOrders kullanın. */
export const reconcileDailyStockWithTrendyol = syncTrendyolInboundOrders;
