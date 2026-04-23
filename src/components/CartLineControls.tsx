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
    <li className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <Link
        href={`/urunler/${line.product.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100"
      >
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link
              href={`/urunler/${line.product.slug}`}
              className="font-medium text-stone-900 hover:underline"
            >
              {line.product.name}
            </Link>
            <p className="text-sm text-stone-500">
              Birim {formatTry(line.product.price)}
            </p>
          </div>
          <p className="text-sm font-semibold text-stone-800">
            {formatTry(lineTotal)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            Adet
            <select
              disabled={pending}
              className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-stone-900"
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
            className="text-sm text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline"
          >
            Kaldır
          </button>
        </div>
      </div>
    </li>
  );
}
