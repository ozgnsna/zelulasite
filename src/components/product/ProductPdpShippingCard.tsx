import { Gift, Truck } from "lucide-react";
import Link from "next/link";
import type { PdpShippingPromise } from "@/lib/storefront/pdp-shipping";
import { ProductPdpShippingCountdown } from "@/components/product/ProductPdpShippingCountdown";

type Props = {
  promise: PdpShippingPromise;
};

/** Tek kart: geri sayım + kargo özeti (iç içe kutu yok). */
export function ProductPdpShippingCard({ promise }: Props) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#e8dfd2]/90 bg-white shadow-[0_6px_20px_rgba(62,53,42,0.05)]"
      aria-label="Kargo ve teslimat"
    >
      <ProductPdpShippingCountdown embedded />

      <div className="space-y-2 px-4 py-3.5">
        <div className="flex items-start gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#faf7f2] text-[#b8945f]">
            <Truck className="size-4" strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[13px] font-semibold text-stone-900">{promise.carrierLabel}</p>
            <p className="text-[12px] leading-snug text-stone-600">{promise.deliveryLine}</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-stone-500">{promise.policyLine}</p>
      </div>

      <p className="flex items-start gap-2 border-t border-[#f0ebe3] bg-[#fffdfb] px-4 py-2.5 text-[11px] leading-relaxed text-stone-600">
        <Gift className="mt-0.5 size-3.5 shrink-0 text-[#c6a15b]" strokeWidth={1.7} aria-hidden />
        Ödeme sonrası sipariş notunda hediye paketi isteyebilirsin.
      </p>

      <div className="border-t border-[#f0ebe3] px-4 py-2 text-center">
        <Link
          href="/kargo-iade"
          className="text-[11px] font-medium text-brand-gold-a11y underline-offset-2 hover:text-stone-800 hover:underline"
        >
          Kargo ve iade detayları
        </Link>
      </div>
    </section>
  );
}
