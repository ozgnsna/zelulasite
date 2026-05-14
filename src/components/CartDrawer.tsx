"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToCart } from "@/app/actions/store";
import { formatTry } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD_TRY } from "@/lib/free-shipping";
import { ShoppingBag } from "lucide-react";

type DrawerLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  quantity: number;
  price: number;
};

type DrawerUpsellItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
};

const CART_HOLD_SECONDS = 10 * 60;

export function CartDrawer({
  count,
  lines,
  upsellItems,
}: {
  count: number;
  lines: DrawerLine[];
  upsellItems: DrawerUpsellItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingUpsellId, setPendingUpsellId] = useState<string | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(CART_HOLD_SECONDS);
  const [, start] = useTransition();
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const urgencyText =
    count >= 3 ? "🔥 Bu ürün bugün en çok tercih edilenlerden" : "⏳ Stoklar hızla tükeniyor";
  const ctaText = count % 2 === 0 ? "Şimdi satın al" : "Ödemeye geç";
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD_TRY - subtotal);
  const shippingMessage =
    shippingRemaining > 0
      ? `Sadece ${formatTry(shippingRemaining)} daha ekle → ücretsiz kargo`
      : `₺${FREE_SHIPPING_THRESHOLD_TRY.toLocaleString("tr-TR")} üzeri ücretsiz kargo avantajın aktif`;
  const upsellTopTwo = upsellItems.slice(0, 2);
  const timerText = useMemo(() => {
    const minute = Math.floor(holdSecondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const second = (holdSecondsLeft % 60).toString().padStart(2, "0");
    return `${minute}:${second}`;
  }, [holdSecondsLeft]);

  useEffect(() => {
    if (!open || lines.length === 0 || holdSecondsLeft <= 0) return;
    const interval = window.setInterval(() => {
      setHoldSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open, lines.length, holdSecondsLeft]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHoldSecondsLeft(CART_HOLD_SECONDS);
          setOpen(true);
        }}
        className="relative inline-flex items-center gap-1.5 rounded-full border border-[#e5dcd0]/90 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition hover:border-stone-300 sm:px-3 sm:text-sm"
        aria-label={count > 0 ? `Sepet, ${count} ürün` : "Sepet"}
      >
        <ShoppingBag className="h-4 w-4 shrink-0 text-stone-600" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Sepet</span>
        {count > 0 ? (
          <span className="grid min-h-[1.125rem] min-w-[1.125rem] place-content-center rounded-full bg-[#4a4034] px-1 text-[10px] font-semibold text-white sm:min-h-[1.25rem] sm:min-w-[1.25rem] sm:text-[11px]">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#e8dece] bg-[#fffdfb] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Sepetim</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white text-base font-semibold text-stone-700 shadow-sm transition hover:border-stone-500 hover:text-stone-900"
                onClick={() => setOpen(false)}
                aria-label="Sepeti kapat"
              >
                ×
              </button>
            </div>
            <p className="mt-3 rounded-lg border border-[#f1e5cf] bg-[#fff7e8] px-3 py-2 text-xs text-[#6e5130]">
              {urgencyText}
            </p>
            <p className="mt-2 text-xs font-medium text-stone-700">Sepetin {timerText} dk boyunca senin için ayrıldı</p>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
              {lines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                  Sepetiniz boş.
                </p>
              ) : (
                lines.map((line) => (
                  <Link
                    key={line.productId}
                    href={`/urunler/${line.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                    onClick={() => setOpen(false)}
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-stone-100">
                      <Image src={line.imageUrl} alt={line.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-stone-500">{line.quantity} adet</p>
                    </div>
                    <p className="text-xs font-medium">{formatTry(line.price * line.quantity)}</p>
                  </Link>
                ))
              )}
              {lines.length > 0 && upsellTopTwo.length > 0 ? (
                <section className="mt-2 rounded-xl border border-[#ede4d7] bg-[#fffcf8] p-2.5">
                  <h3 className="text-sm font-medium text-stone-900">Bunu alanlar şunları da aldı</h3>
                  <ul className="mt-2 space-y-2">
                    {upsellTopTwo.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2">
                        <Link
                          href={`/urunler/${item.slug}`}
                          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-stone-100"
                        >
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="44px" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/urunler/${item.slug}`} className="block truncate text-xs font-medium text-stone-900">
                            {item.name}
                          </Link>
                          <p className="text-[11px] text-stone-600">{formatTry(item.price)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={item.stock < 1 || pendingUpsellId === item.id}
                          onClick={() => {
                            setPendingUpsellId(item.id);
                  start(async () => {
                    const res = await addToCart(item.id);
                    if (!res.ok) {
                      toast.error("Sepete eklenemedi", { description: res.error, duration: 3200 });
                      setPendingUpsellId(null);
                      return;
                    }
                    setPendingUpsellId(null);
                    router.refresh();
                  });
                          }}
                          className="shrink-0 rounded-full border border-[#e4d7c4] px-2.5 py-1 text-[10px] font-medium text-stone-800 transition hover:border-[#c6a15b]/55 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingUpsellId === item.id ? "..." : item.stock < 1 ? "Tükendi" : "Ekle"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
            <div className="sticky bottom-0 left-0 right-0 mt-3 border-t border-[#e8dece] bg-[#fffdfb] p-5">
              <p className="mb-2 text-xs text-stone-500">Sepetiniz hazır. Güvenli ödeme ile siparişinizi şimdi tamamlayın.</p>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-stone-600">Ara Toplam</span>
                <strong className="text-base text-stone-900">{formatTry(subtotal)}</strong>
              </div>
              <p className="mb-2 text-[11px] font-medium text-stone-700">{shippingMessage}</p>
              <p className="mb-2 text-xs font-semibold text-stone-900">🔒 Güvenli ödeme</p>
              <Link
                href="/sepet"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-stone-900 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-[0_10px_20px_rgba(25,25,25,0.2)]"
              >
                {ctaText}
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
