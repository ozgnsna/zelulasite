"use client";

import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";
import { getBayramAnnouncementMessages, isBayramShippingPause } from "@/lib/storefront/bayram-shipping-notice";
import { formatShippingCountdownBanner, getShippingCountdownState } from "@/lib/storefront/pdp-shipping";
import { useEffect, useMemo, useState } from "react";

const TICK_MS = 60_000;

function buildTickerMessages() {
  const threshold = FREE_SHIPPING_THRESHOLD_TRY.toLocaleString("tr-TR");
  const freeShippingLine = `₺${threshold} üzeri ücretsiz kargo`;

  if (isBayramShippingPause()) {
    return getBayramAnnouncementMessages(freeShippingLine);
  }

  const cd = getShippingCountdownState();
  return [
    freeShippingLine,
    formatShippingCountdownBanner(cd),
    "Güvenli ödeme · Kolay iade",
    "Türkiye geneli teslimat",
  ];
}

export function AnnouncementBar() {
  const [tick, setTick] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const messages = useMemo(() => buildTickerMessages(), [tick]);
  const loop = reduceMotion ? messages : [...messages, ...messages];

  return (
    <div
      className="relative flex h-9 items-center overflow-hidden border-b border-[#e8e2d9]/90 bg-[#faf8f5] sm:h-10"
      aria-label="Duyurular"
    >
      <div
        className={
          reduceMotion
            ? "zl-announcement-static flex w-full flex-nowrap items-center justify-center gap-0 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "zl-announcement-marquee flex w-max flex-nowrap items-center"
        }
      >
        {loop.map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 text-[11px] font-medium tracking-wide text-stone-600 sm:px-6 sm:text-xs"
          >
            <span className="text-brand-gold-a11y" aria-hidden>
              ●
            </span>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
