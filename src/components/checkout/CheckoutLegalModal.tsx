"use client";

import { useCallback, useEffect, useId } from "react";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";

export function CheckoutLegalModal({
  open,
  title,
  text,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
}) {
  const titleId = useId();

  const close = useCallback(() => onClose(), [onClose]);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92dvh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#e8dfd3] bg-[#fffdfb] shadow-[0_-8px_40px_rgba(62,52,38,0.18)] sm:rounded-2xl sm:shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eadfce] px-5 py-4 sm:px-6">
          <h3 id={titleId} className="font-serif text-lg font-light text-stone-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-full border border-[#e5ddd1] px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Kapat
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <LegalDocumentBody text={text} />
        </div>
      </div>
    </div>
  );
}
