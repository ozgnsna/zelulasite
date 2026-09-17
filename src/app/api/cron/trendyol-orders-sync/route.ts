import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logMarketplaceSync } from "@/lib/marketplaces/trendyol/client";
import {
  releaseInboundOrdersCronLock,
  tryClaimInboundOrdersCronLock,
} from "@/lib/marketplaces/trendyol/cron-lock";
import { syncTrendyolInboundOrders } from "@/lib/marketplaces/trendyol/daily-stock-reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron / pg_cron, `CRON_SECRET` env tanımlıysa isteği
 * `Authorization: Bearer <CRON_SECRET>` başlığıyla atar.
 * Secret tanımlı değilse uç nokta açık çalışır (kurulum kolaylığı) — canlıda CRON_SECRET tanımla.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron] CRON_SECRET tanımlı değil; trendyol-orders-sync korumasız çalışıyor.");
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Varsayılan açık; TRENDYOL_INBOUND_CRON_PAUSED=true veya ENABLED=false ile kapatılır. */
function isCronSyncEnabled(): boolean {
  if (process.env.TRENDYOL_INBOUND_CRON_PAUSED === "true") return false;
  if (process.env.TRENDYOL_INBOUND_CRON_ENABLED === "false") return false;
  return true;
}

/** Trendyol siparişlerini çeker; site stoğu master kalır (TY snapshot yazılmaz). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isCronSyncEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "TRENDYOL_INBOUND_CRON_PAUSED_OR_DISABLED",
      ran_at: new Date().toISOString(),
    });
  }

  const admin = createAdminClient();
  const ranAt = new Date().toISOString();

  const lockId = await tryClaimInboundOrdersCronLock(admin, 15);
  if (!lockId) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "lock_held", ran_at: ranAt },
      { status: 200 },
    );
  }

  try {
    const result = await syncTrendyolInboundOrders(admin, { orderLookbackDays: 2 });
    const status: "success" | "error" | "skipped" =
      !result.ok ? "error" : "skipped" in result && result.skipped ? "skipped" : "success";
    const message =
      !result.ok
        ? result.message
        : "skipped" in result && result.skipped
          ? "Inbound sync skipped"
          : `Inbound sync ok; fetched=${"ordersFetched" in result ? result.ordersFetched : 0}`;

    await releaseInboundOrdersCronLock(admin, lockId, status, message, {
      ran_at: ranAt,
      orders_fetched: "ordersFetched" in result ? result.ordersFetched : 0,
      stock_lines_updated: "orderStockUpdates" in result ? result.orderStockUpdates : 0,
      unmatched_lines: "orderUnmatched" in result ? result.orderUnmatched : 0,
      duplicate_skipped: "duplicateSkipped" in result ? result.duplicateSkipped : 0,
      restored_orders: "restoredOrders" in result ? result.restoredOrders : 0,
      duration_ms: "duration_ms" in result ? result.duration_ms : undefined,
      started_at: "started_at" in result ? result.started_at : undefined,
      finished_at: "finished_at" in result ? result.finished_at : undefined,
    });

    return NextResponse.json({ ...result, ran_at: ranAt, lock_id: lockId }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    await releaseInboundOrdersCronLock(admin, lockId, "error", message, {
      ran_at: ranAt,
      source: "cron_uncaught",
    });
    try {
      await logMarketplaceSync(admin, {
        integrationId: null,
        entityType: "order",
        action: "inbound_orders_sync",
        status: "error",
        message: `Cron inbound sipariş senkronu beklenmeyen hata: ${message}`,
        metadata: {
          ran_at: ranAt,
          affected_count: 0,
          error_message: message,
          source: "cron_uncaught",
        },
      });
    } catch {
      /* ignore secondary log failure */
    }
    return NextResponse.json({ ok: false, error: message, ran_at: ranAt }, { status: 500 });
  }
}
