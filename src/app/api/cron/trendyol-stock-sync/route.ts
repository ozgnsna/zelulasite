import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileDailyStockWithTrendyol } from "@/lib/marketplaces/trendyol/daily-stock-reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Reconcile birden çok Trendyol API çağrısı yapar; daha uzun süreye izin ver. */
export const maxDuration = 60;

/**
 * Vercel Cron, `CRON_SECRET` env tanımlıysa isteği
 * `Authorization: Bearer <CRON_SECRET>` başlığıyla atar.
 * Secret tanımlı değilse uç nokta açık çalışır (kurulum kolaylığı) — canlıda CRON_SECRET tanımla.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron] CRON_SECRET tanımlı değil; trendyol-stock-sync korumasız çalışıyor.");
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Günlük Trendyol → site stok eşitleme (Vercel Cron tetikler). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const result = await reconcileDailyStockWithTrendyol(admin, { orderLookbackDays: 1 });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
