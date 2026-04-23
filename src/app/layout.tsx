import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Toaster } from "sonner";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-[color:var(--background)] font-sans text-stone-900 antialiased">
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${gaId}', { send_page_view: false });`}
            </Script>
          </>
        ) : null}
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <AnnouncementBar />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
