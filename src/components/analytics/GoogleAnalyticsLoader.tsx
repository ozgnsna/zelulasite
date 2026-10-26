"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isAnalyticsExcludedPath } from "@/lib/analytics/excluded-path";
import {
  CONSENT_UPDATED_EVENT,
  getCookieConsent,
  type CookieConsent,
} from "@/lib/cookies/consent";

function safeTagId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9/_-]/g, "");
}

function applyGtagConsentUpdate(consent: CookieConsent | null) {
  if (typeof window.gtag !== "function") return;
  const analytics = consent?.analytics === true;
  const marketing = consent?.marketing === true;
  window.gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * gtag Consent Mode v2: script consent'ten bağımsız yüklenir.
 * Default denied `layout.tsx` beforeInteractive script'inde.
 */
export function GoogleAnalyticsLoader({
  gaId,
  adsId,
}: {
  gaId: string | null | undefined;
  adsId?: string | null | undefined;
}) {
  const pathname = usePathname() ?? "";
  const ga = gaId?.trim() ? safeTagId(gaId.trim()) : "";
  const ads = adsId?.trim() ? safeTagId(adsId.trim()) : "";
  const adminPath = isAnalyticsExcludedPath(pathname);
  const scriptId = ga || ads;

  useEffect(() => {
    const sync = () => applyGtagConsentUpdate(getCookieConsent());
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    if (ga) {
      window.gtag("config", ga, { send_page_view: false });
    }
    if (ads && !adminPath) {
      window.gtag("config", ads);
    }
  }, [ga, ads, adminPath]);

  if (!scriptId) return null;

  const initConfigs = [
    ga ? `gtag('config','${ga}',{send_page_view:false});` : "",
    ads && !adminPath ? `gtag('config','${ads}');` : "",
  ]
    .filter(Boolean)
    .join("");

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${scriptId}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${initConfigs}`}
      </Script>
    </>
  );
}
