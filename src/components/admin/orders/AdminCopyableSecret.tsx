"use client";

import { useCallback, useState } from "react";
import { shortenId } from "@/lib/admin/order-detail-ui";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.24a2 2 0 00-.59-1.41l-2.24-2.24A2 2 0 0015.76 3H10a2 2 0 00-2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Kısaltılmış gösterim + hover’da tam metin + tam değeri kopyala + “Kopyalandı”. */
export function AdminCopyableSecret({
  value,
  shortenStart = 6,
  shortenEnd = 4,
  className,
}: {
  value: string | null | undefined;
  shortenStart?: number;
  shortenEnd?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const full = String(value ?? "").trim();

  const copy = useCallback(async () => {
    if (!full) return;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [full]);

  if (!full) {
    return <span className="text-sm text-stone-400">—</span>;
  }

  const display = shortenId(full, shortenStart, shortenEnd);

  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span
        className="min-w-0 font-mono text-[13px] font-semibold tracking-tight text-stone-900 tabular-nums"
        title={full}
      >
        {display}
      </span>
      <button
        type="button"
        onClick={copy}
        title={full}
        aria-label="Tam metni panoya kopyala"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e8dfd3] bg-white text-stone-500 shadow-sm transition hover:border-[#c6a15b]/45 hover:text-stone-800 active:scale-[0.98]"
      >
        {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
      </button>
      {copied ? (
        <span className="text-[11px] font-semibold text-emerald-700">Kopyalandı</span>
      ) : null}
    </span>
  );
}
