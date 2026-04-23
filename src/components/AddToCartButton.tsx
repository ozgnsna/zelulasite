"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/app/actions/store";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";

type Props = {
  productId: string;
  productName: string;
  price: number;
  category?: string;
  collection?: string | null;
  disabled?: boolean;
  stock: number;
};

export function AddToCartButton({
  productId,
  productName,
  price,
  category,
  collection,
  disabled,
  stock,
}: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending || stock < 1}
        onClick={() => {
          setMessage(null);
          start(async () => {
            await addToCart(productId);
            setMessage("Sepete eklendi.");
            toast.success("Ürün sepete eklendi");
            trackAddToCart({
              product_id: productId,
              product_name: productName,
              price,
              quantity: 1,
              category,
              collection,
            });
          });
        }}
        className="w-full rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(30,30,30,0.2)] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Ekleniyor…" : stock < 1 ? "Tükendi" : "Sepete ekle"}
      </button>
      {message ? (
        <p className="text-center text-sm text-stone-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
