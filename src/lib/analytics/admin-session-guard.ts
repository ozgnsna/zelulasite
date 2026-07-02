"use client";

import { createClient } from "@/lib/supabase/client";

/** Admin vitrin gezintisi analytics'e düşmesin — oturum + sunucu doğrulaması. */
let cachedExclude: boolean | null = null;
let pending: Promise<boolean> | null = null;

export function resetAdminAnalyticsExclusionCache() {
  cachedExclude = null;
  pending = null;
}

export async function shouldExcludeStorefrontAnalytics(): Promise<boolean> {
  if (cachedExclude !== null) return cachedExclude;
  if (pending) return pending;

  pending = (async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      cachedExclude = false;
      return false;
    }

    try {
      const res = await fetch("/api/analytics/eligibility", { cache: "no-store" });
      if (!res.ok) {
        cachedExclude = false;
        return false;
      }
      const body = (await res.json()) as { exclude?: boolean };
      cachedExclude = body.exclude === true;
      return cachedExclude;
    } catch {
      cachedExclude = false;
      return false;
    }
  })();

  return pending;
}

export function bindAdminAnalyticsExclusionListener() {
  if (typeof window === "undefined") return () => {};
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    resetAdminAnalyticsExclusionCache();
  });
  return () => subscription.unsubscribe();
}
