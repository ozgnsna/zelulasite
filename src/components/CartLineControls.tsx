"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/product/ProductImage";
import { useRouter } from "next/navigation";
import { updateCartItem } from "@/app/actions/store";
import { formatTry } from "@/lib/money";
import { trackRemoveFromCart } from "@/lib/analytics";

export type CartLineRow = {
  id: string;
  quantity: number;
  giftCard?: { recipientEmail: string; recipientName?: string | null };
  variantId?: string;
  variantLabel?: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    stock: number;
    category?: string;
    collection?: string | null;
  };
};

export function CartLineControls({ line }: { line: CartLineRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draftQty, setDraftQty] = useState(String(line.quantity));
  const isGiftCardLine = Boolean(line.giftCard);
  const maxQ = isGiftCardLine ? 1 : Math.max(0, Math.floor(Number(line.product.stock ?? 0)));
  const lineTotal = line.product.price * line.quantity;

  useEffect(() => {
    setDraftQty(String(line.quantity));
  }, [line.quantity]);

  const applyQty = (next: number) => {
    if (next === line.quantity) return;
    start(() => {
      const prev = line.quantity;
      if (next < prev) {
        trackRemoveFromCart({
          product_id: line.product.id,
          product_name: line.product.name,
          price: line.product.price,
          quantity: prev - next,
          category: line.product.category,
          collection: line.product.collection,
        });
      }
      void updateCartItem(line.product.id, next, line.variantId).then(() => router.refresh());
    });
  };

  const plusDisabled = pending || maxQ < 1 || line.quantity >= maxQ;
  const minusDisabled = pending;

  return (
    <li className="flex gap-5 rounded-2xl border border-[#ebe6df]/90 bg-white/95 p-5 shadow-[0_8px_22px_rgba(62,52,38,0.06)] transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_14px_32px_rgba(62,52,38,0.09)]">
      <Link
        href={`/urunler/${line.product.slug}`}
        className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-36 sm:w-36"
      >
        <ProductImage
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 128px, 144px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/urunler/${line.product.slug}`}
              className="line-clamp-2 text-base font-medium text-stone-900 hover:underline"
            >
              {line.product.name}
            </Link>
            <p className="text-[15px] text-stone-500">
              Birim {formatTry(line.product.price)}
            </p>
            {line.variantLabel ? (
              <p className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#e2d6c4] bg-[#fffdf8] px-2 py-0.5 text-xs font-medium text-[#7d5f35]">
                Ölçü: {line.variantLabel}
              </p>
            ) : null}
            {line.giftCard ? (
              <p className="mt-1 text-xs text-stone-600">
                Alıcı:{" "}
                <span className="font-medium text-stone-800">
                  {line.giftCard.recipientName ? `${line.giftCard.recipientName} · ` : ""}
                  {line.giftCard.recipientEmail}
                </span>
                <span className="text-stone-400"> · Dijital hediye kartı</span>
              </p>
            ) : null}
            {maxQ > 0 ? (
              <p className="mt-0.5 text-xs text-stone-500">Stok: {maxQ}</p>
            ) : (
              <p className="mt-0.5 text-xs font-medium text-rose-800">Stokta yok</p>
            )}
          </div>
          <p className="text-base font-semibold text-stone-900">{formatTry(lineTotal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {maxQ >= 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-600">Adet</span>
              <div className="inline-flex items-center gap-1 rounded-full border border-[#e4d8c8] bg-[linear-gradient(180deg,#ffffff,#f9f5ef)] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <button
                  type="button"
                  disabled={minusDisabled}
                  aria-label="Adeti azalt"
                  onClick={() => applyQty(Math.max(0, line.quantity - 1))}
                  className="flex h-8 min-w-[2rem] items-center justify-center rounded-full text-base font-medium text-stone-800 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQ}
                  disabled={pending}
                  aria-label="Adet"
                  className="h-8 w-11 border-0 bg-transparent text-center text-sm font-medium text-stone-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={draftQty}
                  onChange={(e) => {
                    const t = e.target.value.replace(/[^\d]/g, "");
                    setDraftQty(t);
                  }}
                  onBlur={() => {
                    let n = parseInt(draftQty, 10);
                    if (!Number.isFinite(n)) n = line.quantity;
                    n = Math.min(maxQ, Math.max(1, n));
                    setDraftQty(String(n));
                    if (n !== line.quantity) applyQty(n);
                  }}
                />
                <button
                  type="button"
                  disabled={plusDisabled}
                  aria-label="Adeti artır"
                  onClick={() => applyQty(Math.min(maxQ, line.quantity + 1))}
                  className="flex h-8 min-w-[2rem] items-center justify-center rounded-full text-base font-medium text-stone-800 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(() => {
                trackRemoveFromCart({
                  product_id: line.product.id,
                  product_name: line.product.name,
                  price: line.product.price,
                  quantity: line.quantity,
                  category: line.product.category,
                  collection: line.product.collection,
                });
                void updateCartItem(line.product.id, 0, line.variantId).then(() => router.refresh());
              })
            }
            className="text-sm text-stone-500 underline-offset-2 transition hover:text-[#7a5f38] hover:underline"
          >
            Kaldır
          </button>
        </div>
      </div>
    </li>
  );
}
