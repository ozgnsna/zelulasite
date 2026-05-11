"use client";

import { cn } from "@/lib/utils";

/**
 * Trendyol kanalı aç/kapa. `peer/trendyol` bu input’ta kalmalı; aynı ebeveyn altında
 * `input~…` ile gelen `peer-checked/trendyol:*` blokları (ProductForm) bu input’tan sonra gelmeli.
 * Kontrolsüz bırakılır: «Trendyol’u siteden doldur» vb. script’ler `getElementById` + `checked` ile uyumlu kalır.
 */
export function TrendyolChannelActiveControl({ defaultActive }: { defaultActive: boolean }) {
  return (
    <>
      <input
        id="trendyol_active"
        type="checkbox"
        name="trendyol_active"
        defaultChecked={defaultActive}
        className="peer/trendyol sr-only"
      />
      <label
        htmlFor="trendyol_active"
        className={cn(
          "relative z-10 flex min-h-11 cursor-pointer flex-col rounded-xl border border-[#e7ded2]/65 bg-white px-3 py-2.5 transition-colors",
          "peer-checked/trendyol:border-emerald-400/90 peer-checked/trendyol:bg-emerald-50/55",
        )}
      >
        <span className="text-sm font-medium text-stone-800">Trendyol kanalında aktif</span>
        <span className="mt-1 text-[11px] leading-snug text-stone-500">
          Bu kutuya veya bu satıra tıklayarak açıp kapatabilirsiniz. Yeşil çerçeve = açık. Kaydetmeyi unutmayın.
        </span>
        <span className="mt-1 text-[11px] leading-snug text-stone-500">Kapalıyken ürün Trendyol kanalına gönderilmez.</span>
      </label>
    </>
  );
}
