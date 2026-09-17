import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  releaseReviewRemindersCronLock,
  tryClaimReviewRemindersCronLock,
} from "@/lib/reviews/cron-lock";
import { runReviewReminders } from "@/lib/reviews/review-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron] CRON_SECRET tanımlı değil; review-reminders korumasız çalışıyor.");
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * GET /api/cron/review-reminders
 * ?dryRun=1 — e-posta göndermez, sent_at yazmaz
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun =
    url.searchParams.get("dryRun") === "1" ||
    url.searchParams.get("dry_run") === "1" ||
    url.searchParams.get("dryRun") === "true";

  const admin = createAdminClient();
  const ranAt = new Date().toISOString();

  const lockId = await tryClaimReviewRemindersCronLock(admin, 30);
  if (!lockId) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "lock_held", ran_at: ranAt },
      { status: 200 },
    );
  }

  try {
    const result = await runReviewReminders(admin, { dryRun });
    const status: "success" | "error" | "skipped" = !result.ok
      ? "error"
      : result.candidates === 0
        ? "skipped"
        : "success";

    await releaseReviewRemindersCronLock(admin, lockId, status, result.message ?? "done", {
      ran_at: ranAt,
      dry_run: dryRun,
      candidates: result.candidates,
      eligible: result.eligibleAfterProductFilter,
      sent: result.sent,
      errors: result.errors,
      skipped_no_email: result.skippedNoEmail,
      skipped_all_reviewed: result.skippedAllReviewed,
      capped: result.capped,
    });

    try {
      await admin.from("marketplace_sync_logs").insert({
        marketplace: "site",
        entity_type: "order",
        action: "review_reminders",
        status,
        message: result.message ?? null,
        metadata: {
          ran_at: ranAt,
          dry_run: dryRun,
          candidates: result.candidates,
          eligible: result.eligibleAfterProductFilter,
          sent: result.sent,
          errors: result.errors,
          skipped_no_email: result.skippedNoEmail,
          skipped_all_reviewed: result.skippedAllReviewed,
          capped: result.capped,
          samples: result.samples,
        },
      });
    } catch {
      /* log best-effort */
    }

    return NextResponse.json({ ...result, ran_at: ranAt, lock_id: lockId }, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    await releaseReviewRemindersCronLock(admin, lockId, "error", message, {
      ran_at: ranAt,
      dry_run: dryRun,
    });
    return NextResponse.json({ ok: false, error: message, ran_at: ranAt }, { status: 500 });
  }
}
