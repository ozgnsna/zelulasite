"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CONSENT_UPDATED_EVENT } from "@/lib/cookies/consent";
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
      // Consent Mode v2: onay yokken de gtag cookieless ping alır; Meta ayrı gated.
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
