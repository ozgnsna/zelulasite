"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  bindAdminAnalyticsExclusionListener,
  shouldExcludeStorefrontAnalytics,
} from "@/lib/analytics/admin-session-guard";
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
 * gtag Consent Mode v2: script consent'ten bağımsız yüklenir (normal ziyaretçi).
 * Default denied `layout.tsx` beforeInteractive script'inde.
 *
 * Admin path (/admin/*) ve authenticated admin session: script/config yok.
 * Consent granted, exclusion'ı override etmez.
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
  /** Session exclude çözülene kadar false — admin vitrinde tag ayağa kalkmasın. */
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    bindAdminAnalyticsExclusionListener();
    let cancelled = false;

    const syncExclusion = () => {
      void (async () => {
        if (!scriptId || isAnalyticsExcludedPath(pathname)) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (await shouldExcludeStorefrontAnalytics()) {
          if (!cancelled) setAllow(false);
          return;
        }
        if (!cancelled) setAllow(true);
      })();
    };

    const onConsentOrStorage = () => {
      syncExclusion();
      applyGtagConsentUpdate(getCookieConsent());
    };

    syncExclusion();
    applyGtagConsentUpdate(getCookieConsent());
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsentOrStorage);
    window.addEventListener("storage", onConsentOrStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(CONSENT_UPDATED_EVENT, onConsentOrStorage);
      window.removeEventListener("storage", onConsentOrStorage);
    };
  }, [scriptId, pathname]);

  useEffect(() => {
    if (!allow || adminPath) return;
    if (typeof window.gtag !== "function") return;
    if (ga) {
      window.gtag("config", ga, { send_page_view: false });
    }
    if (ads) {
      window.gtag("config", ads);
    }
  }, [ga, ads, adminPath, allow]);

  if (!scriptId || adminPath || !allow) return null;

  const initConfigs = [
    ga ? `gtag('config','${ga}',{send_page_view:false});` : "",
    ads ? `gtag('config','${ads}');` : "",
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
