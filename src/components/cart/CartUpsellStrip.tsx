"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { addToCart } from "@/app/actions/store";
import { formatTry } from "@/lib/money";
import { dispatchAtcShareMoment } from "@/lib/referral/share-copy";

export type CartUpsellItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  stock: number;
};

export function CartUpsellStrip({ items }: { items: CartUpsellItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[#ebe6df]/90 bg-[#fdfcfa] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.05)] sm:p-6">
      <h2 className="font-serif text-lg font-light text-stone-900 sm:text-xl">Stilini tamamla</h2>
      <p className="mt-1 text-[12px] font-light leading-relaxed text-stone-600">
        Senin için seçtik ✨
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="cart-upsell-card flex flex-col overflow-hidden rounded-xl border border-[#e8e0d6]/90 bg-white/90 shadow-[0_6px_16px_rgba(62,52,38,0.05)]"
          >
            <Link href={`/urunler/${p.slug}`} className="relative aspect-square bg-stone-100">
              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="200px" />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <Link href={`/urunler/${p.slug}`} className="line-clamp-2 text-sm font-medium text-stone-900 hover:underline">
                {p.name}
              </Link>
              <p className="text-xs font-light text-stone-600">{formatTry(p.price)}</p>
              <button
                type="button"
                disabled={p.stock < 1 || pendingId === p.id}
                onClick={() => {
                  setPendingId(p.id);
                  start(async () => {
                    await addToCart(p.id);
                    setPendingId(null);
                    queueMicrotask(() => dispatchAtcShareMoment(p.slug));
                    router.refresh();
                  });
                }}
                className="mt-auto rounded-full border border-[#e4d7c4] bg-[linear-gradient(135deg,#faf6ef,#fffdfb)] px-3 py-2 text-[11px] font-medium text-stone-800 transition hover:border-[#c6a15b]/55 hover:shadow-[0_6px_14px_rgba(198,161,91,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingId === p.id ? "Ekleniyor…" : p.stock < 1 ? "Tükendi" : "Sepete ekle"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
