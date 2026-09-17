import type { SupabaseClient } from "@supabase/supabase-js";

export type CronLockStatus = "success" | "error" | "skipped";

export async function tryClaimReviewRemindersCronLock(
  admin: SupabaseClient,
  ttlMinutes = 30,
): Promise<string | null> {
  const { data, error } = await admin.rpc("try_claim_review_reminders_cron_lock", {
    p_ttl_minutes: ttlMinutes,
  });
  if (error) {
    console.warn("[review-reminders-lock] try_claim failed:", error.message);
    return `local:${Date.now()}`;
  }
  if (data == null || data === "") return null;
  return String(data);
}

export async function releaseReviewRemindersCronLock(
  admin: SupabaseClient,
  lockId: string,
  status: CronLockStatus,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (lockId.startsWith("local:")) return;
  const { error } = await admin.rpc("release_review_reminders_cron_lock", {
    p_lock_id: lockId,
    p_status: status,
    p_message: message,
    p_metadata: metadata ?? {},
  });
  if (error) {
    console.warn("[review-reminders-lock] release failed:", error.message);
  }
}
