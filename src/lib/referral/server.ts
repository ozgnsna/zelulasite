import type { SupabaseClient } from "@supabase/supabase-js";
import { ZELULA_REFERRAL_COOKIE } from "@/lib/referral/constants";

function normalizeReferralCode(raw?: string | null) {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return null;
  if (!/^[a-z0-9_-]{4,32}$/.test(t)) return null;
  return t;
}

export async function ensureUserReferralCode(admin: SupabaseClient, userId: string) {
  const { data: profile } = await admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  const existing = normalizeReferralCode(profile?.referral_code);
  if (existing) return existing;

  for (let i = 0; i < 5; i += 1) {
    const candidate = `z${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await admin.from("profiles").update({ referral_code: candidate }).eq("id", userId);
    if (!error) return candidate;
  }
  return null;
}

export async function resolveReferrerFromCode(admin: SupabaseClient, codeRaw?: string | null) {
  const code = normalizeReferralCode(codeRaw);
  if (!code) return null;
  const { data } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  return data?.id ?? null;
}

export async function pickCheckoutReferrer(options: {
  admin: SupabaseClient;
  buyerUserId: string | null;
  referralCode: string | null;
}) {
  const { admin, buyerUserId, referralCode } = options;
  if (!buyerUserId || !referralCode) return { referrerUserId: null as string | null, referralCode: null as string | null };

  const referrerUserId = await resolveReferrerFromCode(admin, referralCode);
  if (!referrerUserId) return { referrerUserId: null, referralCode: null };
  if (referrerUserId === buyerUserId) return { referrerUserId: null, referralCode: null };

  const { data: existingReferredOrder } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", buyerUserId)
    .not("referrer_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (existingReferredOrder?.id) return { referrerUserId: null, referralCode: null };

  return { referrerUserId, referralCode };
}

export { ZELULA_REFERRAL_COOKIE };
