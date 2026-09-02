"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

const NecklaceTryOn = dynamic(
  () => import("@/components/tryon/NecklaceTryOn").then((m) => m.NecklaceTryOn),
  { ssr: false },
);

export type NecklaceTryOnButtonProps = {
  productName: string;
  /**
   * Şeffaf arka planlı gerçek ürün PNG URL'si.
   * Şimdilik `/tryon/{sku}.png` — AI ile yeniden üretilmez.
   * TODO: products.try_on_image_url (Supabase)
   */
  necklaceImageUrl: string;
};

export function NecklaceTryOnButton({ productName, necklaceImageUrl }: NecklaceTryOnButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9ccb9] bg-[#fdfbf8] px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-[#c6a15b]/60 hover:bg-[#f9f1e4] hover:shadow-[0_8px_18px_rgba(198,161,91,0.18)]"
      >
        <Sparkles className="size-4 shrink-0 text-[#b8945f]" strokeWidth={1.6} aria-hidden />
        Üzerinde Dene
      </button>

      {open ? (
        <NecklaceTryOn
          productName={productName}
          necklaceImageUrl={necklaceImageUrl}
          onClose={handleClose}
        />
      ) : null}
    </>
  );
}
