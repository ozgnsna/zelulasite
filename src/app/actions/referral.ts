"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loyaltyFirstReferralShareDescription } from "@/lib/loyalty/ledger-descriptions";
import { ZELULA_REFERRAL_FIRST_SHARE_POINTS } from "@/lib/referral/constants";

export async function claimReferralFirstShareReward() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Oturum gerekli." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("referral_first_share_rewarded_at")
    .eq("id", user.id)
    .maybeSingle();

  const desc = loyaltyFirstReferralShareDescription(user.id);
  const { data: existingRow } = await admin
    .from("loyalty_points_ledger")
    .select("id")
    .eq("user_id", user.id)
    .eq("description", desc)
    .maybeSingle();

  if (existingRow || profile?.referral_first_share_rewarded_at) {
    if (!profile?.referral_first_share_rewarded_at) {
      await admin
        .from("profiles")
        .update({ referral_first_share_rewarded_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    revalidatePath("/hesabim");
    return { ok: true as const, already: true };
  }

  const { error: insertErr } = await admin.from("loyalty_points_ledger").insert({
    user_id: user.id,
    order_id: null,
    points: ZELULA_REFERRAL_FIRST_SHARE_POINTS,
    type: "earned",
    description: desc,
  });

  if (insertErr) {
    return { ok: false as const, error: "Bonus şu an eklenemedi. Biraz sonra tekrar dene." };
  }

  await admin
    .from("profiles")
    .update({ referral_first_share_rewarded_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/hesabim");
  return { ok: true as const, awarded: ZELULA_REFERRAL_FIRST_SHARE_POINTS };
}
