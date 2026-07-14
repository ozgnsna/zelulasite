import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logMarketplaceSync } from "@/lib/marketplaces/trendyol/client";
import { syncTrendyolInboundOrders } from "@/lib/marketplaces/trendyol/daily-stock-reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron, `CRON_SECRET` env tanımlıysa isteği
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
  try {
    const result = await syncTrendyolInboundOrders(admin, { orderLookbackDays: 2 });
    return NextResponse.json({ ...result, ran_at: ranAt }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
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
    return NextResponse.json({ ok: false, error: message, ran_at: ranAt }, { status: 500 });
  }
}
