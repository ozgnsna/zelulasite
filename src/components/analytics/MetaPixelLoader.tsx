"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  bindAdminAnalyticsExclusionListener,
  shouldExcludeStorefrontAnalytics,
} from "@/lib/analytics/admin-session-guard";
import { isAnalyticsExcludedPath } from "@/lib/analytics/excluded-path";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";

export function MetaPixelLoader({ pixelId }: { pixelId: string | null | undefined }) {
  const pathname = usePathname() ?? "";
  const [allow, setAllow] = useState(false);
  const id = pixelId?.trim() ?? "";

  useEffect(() => {
    bindAdminAnalyticsExclusionListener();
    let cancelled = false;

    const sync = () => {
      void (async () => {
        if (!id || isAnalyticsExcludedPath(pathname)) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (await shouldExcludeStorefrontAnalytics()) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (!cancelled) {
          setAllow(getCookieConsent()?.marketing === true);
        }
      })();
    };

    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id, pathname]);

  if (!id || isAnalyticsExcludedPath(pathname) || !allow) return null;

  return (
    <>
      <Script id="meta-pixel-stub" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];}(window,document,'script');fbq('init','${id}');`}
      </Script>
      <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
    </>
  );
}
