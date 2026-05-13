"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/store";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";
import { dispatchAtcShareMoment } from "@/lib/referral/share-copy";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productName: string;
  price: number;
  category?: string;
  collection?: string | null;
  disabled?: boolean;
  stock: number;
  tone?: "default" | "luxury";
  className?: string;
  redirectAfterAdd?: string;
  /** Ürün sayfası slug; sepete ekle sonrası paylaşım anı için (opsiyonel). */
  productSlug?: string | null;
  /** Birincil aksiyon metni */
  label?: string;
  /** İkinci buton: sepete ekle, yönlendirme yok */
  secondaryLabel?: string;
  helperText?: string;
};

export function AddToCartButton({
  productId,
  productName,
  price,
  category,
  collection,
  disabled,
  stock,
  tone = "default",
  className,
  redirectAfterAdd,
  label,
  secondaryLabel,
  helperText,
  productSlug,
}: Props) {
  const [pending, start] = useTransition();
  const [pendingSecondary, startSecondary] = useTransition();
  const [popPrimary, setPopPrimary] = useState(false);
  const [popSecondary, setPopSecondary] = useState(false);
  const router = useRouter();
  const primaryLabel = label ?? "Şimdi sahip ol";

  const luxury =
    tone === "luxury"
      ? "bg-[linear-gradient(135deg,#C6A15B,#E8C98B)] text-[#2f271f] shadow-[0_10px_28px_rgba(198,161,91,0.34)] transition duration-200 ease-out motion-safe:hover:scale-[1.02] motion-safe:hover:brightness-[0.97] motion-safe:hover:shadow-[0_16px_36px_rgba(198,161,91,0.44)] active:scale-[0.98] active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
      : "bg-stone-900 shadow-[0_8px_18px_rgba(30,30,30,0.2)] transition motion-safe:hover:scale-[1.02] hover:bg-stone-800";

  const primaryText =
    pending && redirectAfterAdd
      ? "Yönlendiriliyor…"
      : pending
        ? "Ekleniyor…"
        : stock < 1
          ? "Tükendi"
          : primaryLabel;

  const runAdd = (thenRedirect?: string) => {
    start(async () => {
      await addToCart(productId);
      trackAddToCart({
        product_id: productId,
        product_name: productName,
        price,
        quantity: 1,
        category,
        collection,
      });
      if (thenRedirect) {
        setPopPrimary(true);
        setTimeout(() => setPopPrimary(false), 160);
        toast.success("Hazır ✨", {
          description: "Ödeme adımına geçebilirsiniz.",
          duration: 2200,
        });
        router.push(thenRedirect);
      } else {
        setPopPrimary(true);
        setTimeout(() => setPopPrimary(false), 160);
        toast.success("Sepetine zarif bir dokunuş eklendi ✨", { description: productName, duration: 2600 });
        queueMicrotask(() => dispatchAtcShareMoment(productSlug ?? null));
      }
    });
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <button
          type="button"
          disabled={disabled || pending || pendingSecondary || stock < 1}
          onClick={() => runAdd(redirectAfterAdd)}
          className={cn(
            "min-h-[3.25rem] flex-1 rounded-full px-6 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none sm:min-w-0",
            luxury,
            "zl-btn",
            popPrimary && "zl-pop",
          )}
        >
          {primaryText}
        </button>
        {secondaryLabel ? (
          <button
            type="button"
            disabled={disabled || pending || pendingSecondary || stock < 1}
            title={stock < 1 ? "Bu ürün stokta olmadığı için sepete eklenemez." : undefined}
            onClick={() => {
              startSecondary(async () => {
                await addToCart(productId);
                trackAddToCart({
                  product_id: productId,
                  product_name: productName,
                  price,
                  quantity: 1,
                  category,
                  collection,
                });
                setPopSecondary(true);
                setTimeout(() => setPopSecondary(false), 160);
                toast.success("Sepetine zarif bir dokunuş eklendi ✨", { description: productName, duration: 2600 });
                queueMicrotask(() => dispatchAtcShareMoment(productSlug ?? null));
              });
            }}
            className={cn(
              "min-h-[3.25rem] flex-1 rounded-full border border-[#d9ccb9] bg-[#fdfcfa] px-6 py-3.5 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[12.5rem]",
              "zl-btn",
              popSecondary && "zl-pop",
            )}
          >
            {pendingSecondary ? "Ekleniyor…" : secondaryLabel}
          </button>
        ) : null}
      </div>
      {helperText && stock >= 1 ? (
        <p className="text-center text-[11px] leading-snug text-stone-500 sm:text-xs">{helperText}</p>
      ) : null}
    </div>
  );
}
