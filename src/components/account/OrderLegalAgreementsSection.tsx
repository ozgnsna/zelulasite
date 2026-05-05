"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import type { LegalContractSnapshot } from "@/lib/legal/legal-snapshot";

const DOC_BLOCKS: { key: keyof LegalContractSnapshot["documents"]; label: string }[] = [
  { key: "distanceSalesContract", label: "Mesafeli Satış Sözleşmesi" },
  { key: "preContractInfo", label: "Ön Bilgilendirme Formu" },
  { key: "returnPolicy", label: "İade Politikası" },
  { key: "privacyPolicy", label: "Gizlilik Politikası" },
];

export function OrderLegalAgreementsSection({
  snapshot,
  hash,
}: {
  snapshot: LegalContractSnapshot | null;
  hash: string | null;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

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

  if (!snapshot?.documents) {
    return (
      <section className="mt-8 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-6 shadow-sm" aria-labelledby={titleId}>
        <h2 id={titleId} className="text-sm font-semibold text-stone-900">
          Sözleşmeler
        </h2>
        <p className="mt-2 text-sm text-stone-600">Sözleşme kaydı bulunamadı.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#e8dfd3] bg-[color:var(--surface)] p-6 shadow-sm" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-sm font-semibold text-stone-900">
        Sözleşmeler
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Sipariş anında kabul ettiğin metinlerin arşivlenmiş sürümünü buradan inceleyebilirsin.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#d9c9b2] bg-[linear-gradient(180deg,#fffdfb_0%,#f6f0e8_100%)] px-4 py-3 text-sm font-medium text-stone-900 shadow-sm transition hover:border-[#c6a15b]/50 hover:shadow-md sm:w-auto"
      >
        <span aria-hidden>📄</span>
        Siparişe ait sözleşmeleri görüntüle
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px]"
            aria-label="Kapat"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-dialog`}
            className="relative z-10 flex max-h-[min(92dvh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#e8dfd3] bg-[#fffdfb] shadow-[0_-8px_40px_rgba(62,52,38,0.18)] sm:rounded-2xl sm:shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eadfce] px-5 py-4 sm:px-6">
              <div>
                <h3 id={`${titleId}-dialog`} className="font-serif text-lg text-stone-900">
                  Sipariş sözleşmeleri
                </h3>
                {snapshot.acceptedAt ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Onay zamanı:{" "}
                    {new Date(snapshot.acceptedAt).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
                {hash ? (
                  <p className="mt-1.5 break-all font-mono text-[10px] leading-snug text-stone-400" title={hash}>
                    SHA-256: {hash.slice(0, 12)}…{hash.slice(-8)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
              >
                Kapat
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="space-y-8 [&_.space-y-4]:space-y-3">
                {DOC_BLOCKS.map(({ key, label }) => (
                  <div key={key} className="rounded-xl border border-[#ebe6df] bg-neutral-50/90 p-4 sm:p-5">
                    <h4 className="text-sm font-semibold text-stone-900">{label}</h4>
                    <div className="mt-3 text-sm leading-relaxed text-neutral-800 [&_h2]:mt-6 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:first:mt-0">
                      <LegalDocumentBody text={snapshot.documents[key]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
