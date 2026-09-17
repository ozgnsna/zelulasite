/**
 * Inbound TY sipariş cron kilidi — marketplace_sync_logs satırı + RPC.
 * Session advisory lock kullanılmaz (pooler bağlantısı değişir).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CronLockStatus = "success" | "error" | "skipped";

export async function tryClaimInboundOrdersCronLock(
  admin: SupabaseClient,
  ttlMinutes = 15,
): Promise<string | null> {
  const { data, error } = await admin.rpc("try_claim_inbound_orders_cron_lock", {
    p_ttl_minutes: ttlMinutes,
  });
  if (error) {
    // RPC henüz deploy edilmediyse (migration uygulanmadan) kilidi atlama — yedek cron çalışabilsin
    console.warn("[cron-lock] try_claim failed:", error.message);
    return `local:${Date.now()}`;
  }
  if (data == null || data === "") return null;
  return String(data);
}

export async function releaseInboundOrdersCronLock(
  admin: SupabaseClient,
  lockId: string,
  status: CronLockStatus,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (lockId.startsWith("local:")) return;
  const { error } = await admin.rpc("release_inbound_orders_cron_lock", {
    p_lock_id: lockId,
    p_status: status,
    p_message: message,
    p_metadata: metadata ?? {},
  });
  if (error) {
    console.warn("[cron-lock] release failed:", error.message);
  }
}
