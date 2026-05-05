import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";

export function AnnouncementBar() {
  const n = FREE_SHIPPING_THRESHOLD_TRY.toLocaleString("tr-TR");
  return (
    <div className="border-b border-[#e8e2d9]/90 bg-[#faf8f5] py-2 text-center text-[11px] font-light leading-snug tracking-wide text-stone-600 sm:text-xs">
      <span className="text-[color:var(--brand-gold)]">●</span> ₺{n} üzeri ücretsiz kargo • Zelula özel koleksiyonlarında güvenli alışveriş
    </div>
  );
}
