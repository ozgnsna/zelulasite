"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/store";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";
import { dispatchAtcShareMoment } from "@/lib/referral/share-copy";
import { cn } from "@/lib/utils";

export function QuickAddButton({
  productId,
  productName,
  price,
  category,
  collection,
  className,
  label = "🛒 Stiline Ekle",
  successMessage = "Sepetine zarif bir dokunuş eklendi ✨",
  productSlug,
}: {
  productId: string;
  productName: string;
  price: number;
  category?: string;
  collection?: string | null;
  className?: string;
  label?: string;
  successMessage?: string;
  productSlug?: string | null;
}) {
  const [pending, start] = useTransition();
  const [pop, setPop] = useState(false);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await addToCart(productId);
          if (!res.ok) {
            toast.error("Sepete eklenemedi", { description: res.error, duration: 3200 });
            return;
          }
          setPop(true);
          setTimeout(() => setPop(false), 150);
          toast.success(successMessage, { description: productName });
          queueMicrotask(() => dispatchAtcShareMoment(productSlug ?? null));
          trackAddToCart({
            product_id: productId,
            product_name: productName,
            price,
            quantity: 1,
            category,
            collection,
          });
          router.refresh();
        })
      }
      className={cn(
        "rounded-full border border-[#d9ccb9] bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition duration-200 ease-out hover:bg-[#f8f1e8] disabled:opacity-60 motion-safe:hover:scale-[1.02]",
        "zl-btn",
        pop && "zl-pop",
        className,
      )}
    >
      {pending ? "Ekleniyor..." : label}
    </button>
  );
}
