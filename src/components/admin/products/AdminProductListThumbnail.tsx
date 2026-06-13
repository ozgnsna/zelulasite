"use client";

import { ProductImage } from "@/components/product/ProductImage";

const VARIANTS = {
  list: {
    thumb:
      "relative size-11 shrink-0 overflow-hidden rounded-md border border-stone-200/80 bg-stone-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]",
    thumbSizes: "44px",
    preview: "relative size-36 overflow-hidden rounded-xl border border-stone-200/90 bg-white",
    previewSizes: "144px",
    previewShadow: "shadow-[0_12px_40px_-12px_rgba(28,25,23,0.35)] ring-1 ring-stone-900/5",
    empty: "text-[9px] text-stone-400",
  },
  order: {
    thumb:
      "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-[#dfd2c4]/90 bg-[#f5ede1]",
    thumbSizes: "72px",
    preview: "relative size-44 overflow-hidden rounded-2xl border border-[#dfd2c4]/95 bg-[#fffdfb]",
    previewSizes: "176px",
    previewShadow: "shadow-[0_16px_48px_-14px_rgba(45,37,33,0.28)] ring-1 ring-[#c6a15b]/15",
    empty: "text-xs text-stone-500",
  },
} as const;

export function AdminProductListThumbnail({
  src,
  alt,
  variant = "list",
}: {
  src: string | null;
  alt: string;
  variant?: keyof typeof VARIANTS;
}) {
  const v = VARIANTS[variant];

  if (!src?.trim()) {
    return (
      <div className={v.thumb}>
        <span className={`flex h-full w-full items-center justify-center ${v.empty}`}>—</span>
      </div>
    );
  }

  return (
    <div className="group/thumb relative z-10 shrink-0">
      <div className={v.thumb} aria-hidden>
        <ProductImage src={src} alt="" fill className="object-cover" sizes={v.thumbSizes} />
      </div>
      <div
        className="pointer-events-none absolute left-full top-1/2 z-[120] ml-2 hidden -translate-y-1/2 opacity-0 transition duration-150 ease-out group-hover/thumb:block group-hover/thumb:opacity-100 group-focus-within/thumb:block group-focus-within/thumb:opacity-100"
        role="img"
        aria-label={alt ? `${alt} büyük önizleme` : "Ürün görseli önizlemesi"}
      >
        <div className={`${v.preview} ${v.previewShadow}`}>
          <ProductImage src={src} alt={alt} fill sizes={v.previewSizes} className="object-cover" />
        </div>
      </div>
    </div>
  );
}
