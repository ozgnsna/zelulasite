import { formatTry } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";

export function CartFreeShippingBar({ subtotal }: { subtotal: number }) {
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD_TRY;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_TRY - subtotal);
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD_TRY) * 1000) / 10);

  return (
    <div className="rounded-2xl border border-[#ebe2d6]/90 bg-[linear-gradient(145deg,#fffdfb_0%,#faf6ef_55%,#f5efe4_100%)] px-5 py-4 shadow-[0_10px_28px_rgba(62,52,38,0.07)] sm:px-6 sm:py-5">
      <p className="text-sm font-medium leading-relaxed text-stone-800">
        {qualifies ? (
          <>
            Ücretsiz kargo aktif <span aria-hidden>🎉</span>
          </>
        ) : (
          <>
            Sadece <span className="font-semibold text-[#7a5f38]">{formatTry(remaining)}</span> daha ekle → ücretsiz
            kargo <span aria-hidden>🎉</span>
          </>
        )}
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8dfd3]/90">
        <div
          className="cart-ship-fill h-full rounded-full bg-[linear-gradient(135deg,#C6A15B,#E8C98B)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] font-light text-stone-600">Sepetindeki ürün kısa süreliğine ayrıldı</p>
    </div>
  );
}
