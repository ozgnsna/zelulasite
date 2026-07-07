"use client";

import { useFormStatus } from "react-dom";

/** Ürün kaydı sırasında tam ekran bekleyiş — yavaş kayıtlarda sayfa donmuş gibi görünmesin. */
export function ProductFormSaveOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-[#fdfcfa]/92 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" aria-hidden />
      <p className="text-sm font-medium text-stone-800">Değişiklikler kaydediliyor…</p>
      <p className="max-w-xs px-6 text-center text-xs text-stone-500">
        Birkaç saniye sürebilir; sayfayı kapatmayın.
      </p>
    </div>
  );
}
