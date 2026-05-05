"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";
import { trackPageView } from "@/lib/analytics";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fire = () => {
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
