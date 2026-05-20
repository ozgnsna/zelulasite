"use client";

import { getShippingCountdownState } from "@/lib/storefront/pdp-shipping";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const TICK_MS = 30_000;

/** Canlı geri sayım — İstanbul 13:00 kesimi; tüm PDP’lerde. */
export function ProductPdpShippingCountdown() {
  const [countdown, setCountdown] = useState(() => getShippingCountdownState());

  useEffect(() => {
    const tick = () => setCountdown(getShippingCountdownState());
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const isSameDay = countdown.urgency === "same-day";

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        isSameDay
          ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/95 to-[#f4faf6]"
          : "border-[#eadfce] bg-gradient-to-r from-[#fffaf3] to-[#faf7f2]",
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <p
        className={cn(
          "text-[13px] leading-relaxed",
          isSameDay ? "text-emerald-950" : "text-stone-800",
        )}
      >
        <span className={cn("font-bold", isSameDay ? "text-emerald-800" : "text-[#7d5f35]")}>
          {countdown.hours > 0 ? `${countdown.hours} saat ` : ""}
          {countdown.minutes} dakika
        </span>{" "}
        <span className={cn("font-semibold", isSameDay ? "text-emerald-900" : "text-stone-900")}>
          {countdown.tail}
        </span>
      </p>
    </div>
  );
}
