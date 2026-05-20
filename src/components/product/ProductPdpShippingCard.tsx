import { Gift, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import type { PdpShippingPromise } from "@/lib/storefront/pdp-shipping";

type Props = {
  promise: PdpShippingPromise;
};

/** Trendyol tarzı kargo güven kutusu — Zelula renkleri. */
export function ProductPdpShippingCard({ promise }: Props) {
  return (
    <section className="space-y-2.5" aria-label="Kargo ve teslimat">
      <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/95 to-[#f4faf6] px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-emerald-950">
          {promise.cutoffCountdown ? (
            <>
              <span className="font-bold text-emerald-800">
                {promise.cutoffCountdown.hours > 0 ? `${promise.cutoffCountdown.hours} saat ` : ""}
                {promise.cutoffCountdown.minutes} dakika
              </span>{" "}
              <span className="font-semibold text-emerald-900">{promise.urgencyTail}</span>
            </>
          ) : (
            <span className="font-medium text-emerald-900">{promise.urgencyTail}</span>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-[#e8dfd2] bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(62,53,42,0.04)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#eadfce] bg-[#faf7f2]">
            <Truck className="size-4 text-[#b8945f]" strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[13px] font-semibold text-stone-900">{promise.carrierLabel}</p>
            <p className="text-[13px] leading-snug text-stone-700">{promise.deliveryLine}</p>
            <p className="flex items-center gap-1 text-[11px] text-stone-500">
              <MapPin className="size-3 shrink-0" strokeWidth={1.8} aria-hidden />
              Türkiye geneli teslimat
            </p>
            <p className="text-[11px] leading-relaxed text-stone-500">{promise.noteLine}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#f0e4d4] bg-[#fffaf3] px-3.5 py-2.5">
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-700">
          <Gift className="mt-0.5 size-3.5 shrink-0 text-[#c6a15b]" strokeWidth={1.7} aria-hidden />
          Ödeme sonrası sipariş notunda hediye paketi isteyebilirsin.
        </p>
      </div>

      <Link
        href="/kargo-iade"
        className="inline-block text-[11px] font-medium text-[#9a7848] underline-offset-2 hover:text-[#7d5f35] hover:underline"
      >
        Kargo ve iade detayları →
      </Link>
    </section>
  );
}
