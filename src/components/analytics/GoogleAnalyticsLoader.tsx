"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isAnalyticsExcludedPath } from "@/lib/analytics/excluded-path";
import { CONSENT_UPDATED_EVENT, getCookieConsent } from "@/lib/cookies/consent";

function safeTagId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9/_-]/g, "");
}

export function GoogleAnalyticsLoader({
  gaId,
  adsId,
}: {
  gaId: string | null | undefined;
  adsId?: string | null | undefined;
}) {
  const pathname = usePathname() ?? "";
  const [allowGa, setAllowGa] = useState(false);
  const [allowAds, setAllowAds] = useState(false);

  const ga = gaId?.trim() ? safeTagId(gaId.trim()) : "";
  const ads = adsId?.trim() ? safeTagId(adsId.trim()) : "";

  useEffect(() => {
    const sync = () => {
      const consent = getCookieConsent();
      const adminPath = isAnalyticsExcludedPath(pathname);
      setAllowGa(Boolean(ga && consent?.analytics === true));
      setAllowAds(Boolean(ads && consent?.marketing === true && !adminPath));
    };
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [ga, ads, pathname]);

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    if (allowGa && ga) {
      window.gtag("config", ga, { send_page_view: false });
    }
    if (allowAds && ads) {
      window.gtag("config", ads);
    }
  }, [allowGa, allowAds, ga, ads]);

  if (!allowGa && !allowAds) return null;

  const scriptId = allowGa && ga ? ga : ads;
  if (!scriptId) return null;

  const initConfigs = [
    allowGa && ga ? `gtag('config','${ga}',{send_page_view:false});` : "",
    allowAds && ads ? `gtag('config','${ads}');` : "",
  ]
    .filter(Boolean)
    .join("");

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`} strategy="lazyOnload" />
      <Script id="gtag-init-consented" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${initConfigs}`}
      </Script>
    </>
  );
}
