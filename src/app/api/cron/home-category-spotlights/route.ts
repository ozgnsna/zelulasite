import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getIsoWeekKey,
  syncHomeCategorySpotlightsToDb,
} from "@/lib/storefront/home-category-spotlights";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron] CRON_SECRET tanımlı değil; home-category-spotlights korumasız çalışıyor.");
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Her Pazartesi ana sayfa kategori kartlarını o haftanın ürün görseliyle günceller. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ranAt = new Date().toISOString();
  const weekKey = getIsoWeekKey();

  try {
    const admin = createAdminClient();
    const result = await syncHomeCategorySpotlightsToDb(admin, weekKey);

    revalidateTag("home-category-spotlights", "max");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      ran_at: ranAt,
      week_key: result.weekKey,
      updated: result.updated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message, ran_at: ranAt, week_key: weekKey }, { status: 500 });
  }
}
