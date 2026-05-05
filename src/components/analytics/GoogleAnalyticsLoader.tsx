"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";

export function GoogleAnalyticsLoader({ gaId }: { gaId: string | null | undefined }) {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAllow(Boolean(gaId?.trim() && getCookieConsent()?.analytics === true));
    };
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [gaId]);

  if (!gaId?.trim() || !allow) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init-consented" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', '${gaId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
