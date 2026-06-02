"use client";

import { cn } from "@/lib/utils";
import {
  useOptionalVariantSelection,
  VARIANT_SELECTOR_ANCHOR_ID,
} from "@/components/product/ProductVariantContext";

/** Yüzük ölçüsü gibi varyant seçimi — PDP'de ölçü kutucukları. */
export function ProductSizeSelector({ title = "Ölçü" }: { title?: string }) {
  const ctx = useOptionalVariantSelection();
  if (!ctx || ctx.variants.length === 0) return null;
  const { variants, selectedVariantId, setSelectedVariantId } = ctx;

  return (
    <div id={VARIANT_SELECTOR_ANCHOR_ID} className="space-y-2 scroll-mt-28">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</span>
        {selectedVariantId ? (
          <span className="text-[11px] text-stone-500">Seçili</span>
        ) : (
          <span className="text-[11px] font-medium text-rose-700">Lütfen ölçü seçin</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={title}>
        {variants.map((v) => {
          const out = v.stock_quantity < 1;
          const selected = v.id === selectedVariantId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={out}
              onClick={() => setSelectedVariantId(selected ? null : v.id)}
              className={cn(
                "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-3.5 text-sm font-semibold transition",
                out
                  ? "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-300 line-through"
                  : selected
                    ? "border-[#c6a15b] bg-[#fff9f0] text-[#7d5f35] shadow-[0_4px_14px_rgba(198,161,91,0.22)]"
                    : "border-[#e2d6c4] bg-white text-stone-800 hover:border-[#c6a15b]/60 hover:bg-[#fffdf8]",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
