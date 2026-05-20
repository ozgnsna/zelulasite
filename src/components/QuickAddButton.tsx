"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/store";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";
import { dispatchAtcShareMoment } from "@/lib/referral/share-copy";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

type Props = {
  productId: string;
  productName: string;
  price: number;
  category?: string;
  collection?: string | null;
  className?: string;
  label?: string;
  successMessage?: string;
  productSlug?: string | null;
  /** Kart üzerindeyken ürün linkine tıklamayı engeller */
  isolateClick?: boolean;
  /** `icon` — köşede küçük sepet; `text` — yazılı buton */
  variant?: "text" | "icon";
};

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
  isolateClick = false,
  variant = "text",
}: Props) {
  const [pending, start] = useTransition();
  const [pop, setPop] = useState(false);
  const router = useRouter();

  const isIcon = variant === "icon";
  const ariaLabel = isIcon ? `${productName} — sepete ekle` : undefined;

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={ariaLabel}
      title={isIcon ? "Sepete ekle" : undefined}
      onClick={(e) => {
        if (isolateClick) {
          e.preventDefault();
          e.stopPropagation();
        }
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
        });
      }}
      className={cn(
        "transition duration-200 ease-out disabled:opacity-60",
        "zl-btn",
        pop && "zl-pop",
        isIcon
          ? "flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e8dfd2] bg-white/95 text-stone-800 shadow-[0_4px_14px_rgba(62,52,38,0.12)] hover:border-[#c6a15b]/50 hover:bg-[#fff9f0] motion-safe:hover:scale-105"
          : "rounded-full border border-[#d9ccb9] bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-[#f8f1e8] motion-safe:hover:scale-[1.02]",
        className,
      )}
    >
      {pending ? (
        isIcon ? (
          <span className="size-3.5 animate-pulse rounded-full bg-stone-300" aria-hidden />
        ) : (
          "Ekleniyor..."
        )
      ) : isIcon ? (
        <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        label
      )}
    </button>
  );
}
