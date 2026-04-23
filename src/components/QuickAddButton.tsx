"use client";

import { useTransition } from "react";
import { addToCart } from "@/app/actions/store";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";

export function QuickAddButton({
  productId,
  productName,
  price,
  category,
  collection,
}: {
  productId: string;
  productName: string;
  price: number;
  category?: string;
  collection?: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await addToCart(productId);
          toast.success("Ürün sepete eklendi");
          trackAddToCart({
            product_id: productId,
            product_name: productName,
            price,
            quantity: 1,
            category,
            collection,
          });
        })
      }
      className="rounded-full border border-[#d9ccb9] bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-[#f8f1e8] disabled:opacity-60"
    >
      {pending ? "Ekleniyor..." : "Hızlı ekle"}
    </button>
  );
}
