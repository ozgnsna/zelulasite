"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";
import { isAnalyticsExcludedPath } from "@/lib/analytics/excluded-path";
import { bindAdminAnalyticsExclusionListener } from "@/lib/analytics/admin-session-guard";
import { trackPageView } from "@/lib/analytics";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    return bindAdminAnalyticsExclusionListener();
  }, []);

  useEffect(() => {
    const fire = () => {
      if (isAnalyticsExcludedPath(pathname)) return;
      if (!getCookieConsent()?.analytics) return;
      const search = searchParams?.toString();
      const path = search ? `${pathname}?${search}` : pathname;
      trackPageView(path);
    };
    fire();
    window.addEventListener(CONSENT_UPDATED_EVENT, fire);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, fire);
  }, [pathname, searchParams]);

  return null;
}
