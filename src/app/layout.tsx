import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/cookies/consent";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { StorefrontSiteChrome } from "@/components/StorefrontSiteChrome";
import { Toaster } from "sonner";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsLoader } from "@/components/analytics/GoogleAnalyticsLoader";
import { MetaPixelLoader } from "@/components/analytics/MetaPixelLoader";
import { MicrosoftClarityLoader } from "@/components/analytics/MicrosoftClarityLoader";
import { CookieBanner } from "@/components/CookieBanner";
import { ReferralTrackingBridge } from "@/components/referral/ReferralTrackingBridge";
import { AddToCartShareHost } from "@/components/referral/AddToCartShareHost";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd } from "@/lib/seo/product";
import { DEFAULT_SITE_ORIGIN } from "@/lib/seo/site";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const siteDescription =
  "Zelula Design: Premium ama erişilebilir takı seçkileri. Zamansız tasarım, modern dokunuş.";

const ogImage = "/zelula-logo.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(DEFAULT_SITE_ORIGIN),
  title: {
    default: "Zelula Design",
    template: "%s | Zelula",
  },
  description: siteDescription,
  openGraph: {
    title: "Zelula Design",
    description: "Günlük ışıltını tamamlayan seçkiler.",
    type: "website",
    locale: "tr_TR",
    siteName: "Zelula Design",
    images: [
      {
        url: ogImage,
        alt: "Zelula Design",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelula Design",
    description: "Günlük ışıltını tamamlayan seçkiler.",
    images: [ogImage],
  },
  verification: {
    google: "HSZYNiQJWmqxM83inO_rr6QFvW17nkgaEY2dR5Dc_S4",
  },
  icons: {
    icon: [
      { url: "/icon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

/** Consent Mode v2 default — gtag.js yüklenmeden önce (beforeInteractive). */
const GTAG_CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});gtag('set','url_passthrough',true);gtag('set','ads_data_redaction',true);try{var raw=localStorage.getItem(${JSON.stringify(COOKIE_CONSENT_STORAGE_KEY)});if(raw){var c=JSON.parse(raw);if(c&&c.necessary===true){gtag('consent','update',{analytics_storage:c.analytics===true?'granted':'denied',ad_storage:c.marketing===true?'granted':'denied',ad_user_data:c.marketing===true?'granted':'denied',ad_personalization:c.marketing===true?'granted':'denied'});}}}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let pathname = "";
  try {
    const requestHeaders = await headers();
    pathname = requestHeaders.get("x-pathname") ?? "";
  } catch {
    pathname = "";
  }
  const isAdminRoute = pathname.startsWith("/admin");
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-[color:var(--background)] font-sans text-stone-900 antialiased">
        <Script id="gtag-consent-default" strategy="beforeInteractive">
          {GTAG_CONSENT_DEFAULT_SCRIPT}
        </Script>
        <JsonLd data={buildOrganizationJsonLd()} />
        <GoogleAnalyticsLoader gaId={gaId} adsId={adsId} />
        <MicrosoftClarityLoader projectId={clarityId} />
        {isAdminRoute ? null : <MetaPixelLoader pixelId={metaPixelId} />}
        <Suspense fallback={null}>
          <AnalyticsProvider />
          <ReferralTrackingBridge />
        </Suspense>
        {isAdminRoute ? null : (
          <div className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] shadow-[0_4px_16px_-6px_rgba(62,52,38,0.14)]">
            <AnnouncementBar />
            <div className="border-t-2 border-[#d4c8b8] border-b border-[#e0d5c8] bg-white">
              <StorefrontSiteChrome />
            </div>
          </div>
        )}
        <div className="flex-1">{children}</div>
        {isAdminRoute ? null : <Footer />}
        <Toaster richColors position="top-right" />
        <CookieBanner />
        <AddToCartShareHost />
      </body>
    </html>
  );
}
