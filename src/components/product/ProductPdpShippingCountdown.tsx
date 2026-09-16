"use client";

import {
  formatShippingCountdownBanner,
  getShippingCountdownState,
  SHIPPING_BANNER_SSR_NEUTRAL,
} from "@/lib/storefront/pdp-shipping";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

const TICK_MS = 30_000;

type Props = {
  /** Tek kargo kartının üst şeridi */
  embedded?: boolean;
};

/** Canlı geri sayım — İstanbul 13:00 kesimi (SSR’de nötr metin). */
export function ProductPdpShippingCountdown({ embedded = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(() => getShippingCountdownState());

  useEffect(() => {
    setMounted(true);
    const tick = () => setCountdown(getShippingCountdownState());
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const isSameDay = mounted && countdown.urgency === "same-day";
  const message = mounted ? formatShippingCountdownBanner(countdown) : SHIPPING_BANNER_SSR_NEUTRAL;

  return (
    <div
      className={cn(
        embedded
          ? "flex items-start gap-2.5 border-b border-[#ebe6dc] bg-[#faf8f5]/90 px-4 py-3"
          : "rounded-xl border px-3.5 py-3",
        !embedded &&
          (isSameDay
            ? "border-emerald-200/70 bg-emerald-50/80"
            : "border-[#eadfce] bg-[#fffaf3]"),
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <Clock
        className={cn("mt-0.5 size-4 shrink-0", isSameDay ? "text-emerald-700" : "text-[#b8945f]")}
        strokeWidth={1.75}
        aria-hidden
      />
      <p className={cn("min-w-0 text-[12px] leading-snug sm:text-[13px]", isSameDay ? "text-emerald-950" : "text-stone-800")}>
        {message}
      </p>
    </div>
  );
}
