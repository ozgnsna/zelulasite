import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Toaster } from "sonner";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsLoader } from "@/components/analytics/GoogleAnalyticsLoader";
import { MicrosoftClarityLoader } from "@/components/analytics/MicrosoftClarityLoader";
import { CookieBanner } from "@/components/CookieBanner";
import { ReferralTrackingBridge } from "@/components/referral/ReferralTrackingBridge";
import { AddToCartShareHost } from "@/components/referral/AddToCartShareHost";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Zelula — Takı",
    template: "%s · Zelula",
  },
  description:
    "Zelula: Premium ama erişilebilir takı seçkileri. Zamansız tasarım, modern dokunuş.",
  openGraph: {
    title: "Zelula",
    description: "Günlük ışıltını tamamlayan seçkiler.",
    type: "website",
    locale: "tr_TR",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-[color:var(--background)] font-sans text-stone-900 antialiased">
        <GoogleAnalyticsLoader gaId={gaId} />
        <MicrosoftClarityLoader projectId={clarityId} />
        <Suspense fallback={null}>
          <AnalyticsProvider />
          <ReferralTrackingBridge />
        </Suspense>
        {isAdminRoute ? null : <AnnouncementBar />}
        {isAdminRoute ? null : <Header />}
        <div className="flex-1">{children}</div>
        {isAdminRoute ? null : <Footer />}
        <Toaster richColors position="top-right" />
        <CookieBanner />
        <AddToCartShareHost />
      </body>
    </html>
  );
}
