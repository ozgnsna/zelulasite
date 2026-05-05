"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { updateCartItem } from "@/app/actions/store";
import { formatTry } from "@/lib/money";
import { trackRemoveFromCart } from "@/lib/analytics";

export type CartLineRow = {
  id: string;
  quantity: number;
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
  const [pending, start] = useTransition();
  const lineTotal = line.product.price * line.quantity;

  return (
    <li className="flex gap-5 rounded-2xl border border-[#ebe6df]/90 bg-white/95 p-5 shadow-[0_8px_22px_rgba(62,52,38,0.06)] transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_14px_32px_rgba(62,52,38,0.09)]">
      <Link
        href={`/urunler/${line.product.slug}`}
        className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-36 sm:w-36"
      >
        <Image
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
          </div>
          <p className="text-base font-semibold text-stone-900">
            {formatTry(lineTotal)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            Adet
            <select
              disabled={pending}
              className="rounded-full border border-[#e4d8c8] bg-[linear-gradient(180deg,#ffffff,#f9f5ef)] px-3 py-1.5 text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
              value={line.quantity}
              onChange={(e) => {
                const q = Number(e.target.value);
                start(() => {
                  if (q < line.quantity) {
                    trackRemoveFromCart({
                      product_id: line.product.id,
                      product_name: line.product.name,
                      price: line.product.price,
                      quantity: line.quantity - q,
                      category: line.product.category,
                      collection: line.product.collection,
                    });
                  }
                  void updateCartItem(line.product.id, q);
                });
              }}
            >
              {Array.from({ length: Math.min(line.product.stock, 99) }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ),
              )}
            </select>
          </label>
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
                void updateCartItem(line.product.id, 0);
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
