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

declare global {
  interface Window {
    __zelulaClarityInitialized?: boolean;
  }
}

export function MicrosoftClarityLoader({
  projectId,
}: {
  projectId: string | null | undefined;
}) {
  const pathname = usePathname() ?? "";
  const [allow, setAllow] = useState(false);
  const normalizedProjectId = projectId?.trim() ?? "";
  const adminPath = isAnalyticsExcludedPath(pathname);

  useEffect(() => {
    bindAdminAnalyticsExclusionListener();
    let cancelled = false;

    const sync = () => {
      void (async () => {
        if (!normalizedProjectId || isAnalyticsExcludedPath(pathname)) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (await shouldExcludeStorefrontAnalytics()) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (!cancelled) {
          setAllow(getCookieConsent()?.analytics === true);
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
  }, [normalizedProjectId, pathname]);

  if (!normalizedProjectId || adminPath || !allow) return null;

  return (
    <Script id="clarity-init-consented" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){if(c.__zelulaClarityInitialized){return;}c.__zelulaClarityInitialized=true;c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${normalizedProjectId}");`}
    </Script>
  );
}
