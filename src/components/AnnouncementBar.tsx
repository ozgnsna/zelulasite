"use client";

import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";
import { getShippingCountdownState } from "@/lib/storefront/pdp-shipping";
import { useEffect, useMemo, useState } from "react";

const TICK_MS = 60_000;

function buildTickerMessages() {
  const threshold = FREE_SHIPPING_THRESHOLD_TRY.toLocaleString("tr-TR");
  const cd = getShippingCountdownState();

  const sameDayLine =
    cd.urgency === "same-day"
      ? `Son ${cd.hours > 0 ? `${cd.hours} saat ` : ""}${cd.minutes} dk — bugün kargoda`
      : cd.tail.includes("pazartesi")
        ? "Pazartesi 13:00'a kadar sipariş — pazartesi kargoda"
        : "Yarın 13:00'a kadar sipariş — yarın kargoda";

  return [
    `₺${threshold} üzeri ücretsiz kargo`,
    sameDayLine,
    "Saat 13:00'a kadar verilen siparişler aynı gün yola çıkar",
    "Güvenli ödeme · Kolay iade",
    "Türkiye geneli teslimat",
  ];
}

export function AnnouncementBar() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const messages = useMemo(() => buildTickerMessages(), [tick]);

  const loop = [...messages, ...messages];

  return (
    <div
      className="relative overflow-hidden border-b border-[#e8e2d9]/90 bg-[#faf8f5] py-2.5"
      aria-label="Duyurular"
    >
      <div className="zl-announcement-marquee flex w-max min-w-full">
        {loop.map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 px-6 text-[11px] font-medium tracking-wide text-stone-600 sm:text-xs"
          >
            <span className="text-[color:var(--brand-gold)]" aria-hidden>
              ●
            </span>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
