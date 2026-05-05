"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserReferralCode } from "@/lib/referral/server";
import { siteBaseUrl, withReferralQuery } from "@/lib/referral/share-url";

/**
 * Read-only: builds a share URL for a product path or home, with ?ref= when logged in.
 * Does not change loyalty or referral attribution rules.
 */
export async function getReferralShareLinkForProductSlug(productSlug: string | null) {
  const base = siteBaseUrl();
  const path =
    productSlug && productSlug.trim().length > 0 ? `/urunler/${productSlug.trim()}` : "/";
  const cleanUrl = `${base}${path === "/" ? "/" : path}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { loggedIn: false as const, shareUrl: cleanUrl };
  }

  const admin = createAdminClient();
  const code = await ensureUserReferralCode(admin, user.id);
  if (!code) {
    return { loggedIn: true as const, shareUrl: cleanUrl };
  }

  return { loggedIn: true as const, shareUrl: withReferralQuery(cleanUrl, code) };
}
