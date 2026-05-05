"use client";

import { useEffect, useId, useState } from "react";
import type { CookieConsent } from "@/lib/cookies/consent";

export function CookieSettingsModal({
  open,
  initialAnalytics,
  initialMarketing,
  onClose,
  onSave,
}: {
  open: boolean;
  initialAnalytics: boolean;
  initialMarketing: boolean;
  onClose: () => void;
  onSave: (next: Pick<CookieConsent, "analytics" | "marketing">) => void;
}) {
  const titleId = useId();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [marketing, setMarketing] = useState(initialMarketing);

  useEffect(() => {
    if (!open) return;
    setAnalytics(initialAnalytics);
    setMarketing(initialMarketing);
  }, [open, initialAnalytics, initialMarketing]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(88dvh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#e8dfd3] bg-[#fffdfb] shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-[#eadfce] px-5 py-4 sm:px-6">
          <h2 id={titleId} className="font-serif text-lg text-stone-900">
            Çerez ayarları
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Tercihlerini dilediğin zaman güncelleyebilirsin. Zorunlu çerezler siteyi çalıştırmak için gereklidir.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="rounded-xl border border-[#ebe6df] bg-[#faf8f5] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">Zorunlu çerezler</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  Oturum, güvenlik ve sepet gibi temel işlevler için gereklidir.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                Açık
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#e8dfd3] bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-stone-900">Analitik çerezler</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                Ziyaret istatistikleri ve performans ölçümü (ör. Google Analytics).
              </p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-[#b8945f] focus:ring-[#c6a15b]/40"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#e8dfd3] bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-stone-900">Pazarlama çerezleri</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                İlgi alanına dayalı içerik ve kampanya ölçümü (şimdilik tercih olarak saklanır).
              </p>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-[#b8945f] focus:ring-[#c6a15b]/40"
            />
          </label>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-[#eadfce] p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="order-2 min-h-[48px] rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 sm:order-1 sm:min-h-0 sm:py-2.5"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, marketing })}
            className="order-1 min-h-[48px] rounded-full bg-[linear-gradient(135deg,#2f2a24,#1f1b17)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:order-2 sm:min-h-0 sm:py-2.5"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
