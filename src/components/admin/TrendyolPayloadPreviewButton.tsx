"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getTrendyolProductPayloadPreviewAction } from "@/app/actions/admin";
import type { TrendyolPayloadPreviewIssue } from "@/lib/marketplaces/trendyol/products";

type PreviewResult = {
  payload: unknown;
  issues: TrendyolPayloadPreviewIssue[];
};

function issueTone(level: TrendyolPayloadPreviewIssue["level"]) {
  if (level === "error") return "text-red-800 bg-red-50 border-red-200/80";
  if (level === "warning") return "text-amber-900 bg-amber-50 border-amber-200/80";
  return "text-stone-700 bg-stone-100 border-stone-200/80";
}

export function TrendyolPayloadPreviewButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreviewResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const openAndLoad = () => {
    setOpen(true);
    setData(null);
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await getTrendyolProductPayloadPreviewAction(productId);
      if (!res.ok) {
        setData(null);
        setError(res.message);
        return;
      }
      setData({ payload: res.payload, issues: res.issues });
    });
  };

  const close = useCallback(() => {
    setOpen(false);
    setData(null);
    setError(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const attributesJson =
    data?.payload &&
    typeof data.payload === "object" &&
    data.payload !== null &&
    "items" in data.payload &&
    Array.isArray((data.payload as { items?: unknown[] }).items)
      ? JSON.stringify((data.payload as { items: Array<{ attributes?: unknown }> }).items[0]?.attributes ?? [], null, 2)
      : "[]";

  const fullJson = data ? JSON.stringify(data.payload, null, 2) : "";

  const copy = async () => {
    if (!fullJson) return;
    try {
      await navigator.clipboard.writeText(fullJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openAndLoad}
        className="rounded border border-stone-300 bg-white px-2 py-1 text-[10px] text-stone-700 hover:bg-stone-50"
      >
        Gönderim önizlemesi
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ty-preview-title"
          onClick={close}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-300 bg-[#f4f4f5] text-stone-900 shadow-xl dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-300/80 px-4 py-3 dark:border-zinc-700">
              <div>
                <h3 id="ty-preview-title" className="text-sm font-semibold tracking-tight">
                  Trendyol Gönderim Önizlemesi
                </h3>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-zinc-400">
                  Trendyol&apos;a gönderilecek gövde (dry-run). İstek yapılmaz.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!fullJson}
                  className="rounded border border-stone-400 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-40 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded border border-transparent px-2 py-1 text-[11px] text-stone-500 hover:bg-stone-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Kapat"
                >
                  Kapat
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {pending && !data && !error ? (
                <p className="text-xs text-stone-500 dark:text-zinc-400">Yükleniyor…</p>
              ) : null}
              {error ? <p className="text-xs text-red-700 dark:text-red-400">{error}</p> : null}

              {data ? (
                <>
                  {data.issues.length > 0 ? (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-500">
                        Kontrol özeti
                      </p>
                      <ul className="space-y-1.5">
                        {data.issues.map((issue, i) => (
                          <li
                            key={`${issue.path}-${i}`}
                            className={`rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${issueTone(issue.level)}`}
                          >
                            <span className="font-mono text-[10px] opacity-80">{issue.path}</span>
                            <span className="mx-1.5 opacity-40">·</span>
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mb-3 text-[11px] text-emerald-800 dark:text-emerald-400/90">
                      Önizleme kontrollerinde bariz eksik görünmüyor; yine de Trendyol kurallarını doğrulayın.
                    </p>
                  )}

                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-400/90">
                    Özellikler (attributes)
                  </p>
                  <pre className="mb-3 max-h-40 overflow-auto rounded-lg border border-amber-200/90 bg-amber-50/80 p-2.5 text-[11px] leading-relaxed text-stone-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-zinc-100">
                    <code className="font-mono">{attributesJson}</code>
                  </pre>

                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-500">
                    Tam gönderim gövdesi
                  </p>
                  <pre className="max-h-[min(42vh,360px)] overflow-auto rounded-lg border border-stone-300 bg-[#fafafa] p-2.5 text-[11px] leading-relaxed text-stone-900 shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                    <code className="font-mono">{fullJson}</code>
                  </pre>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
