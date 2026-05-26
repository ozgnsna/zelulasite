"use client";

import { useState } from "react";

export function CopyValueButton({
  value,
  label = "Kopyala",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="shrink-0 rounded-lg border border-amber-300/90 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 transition hover:bg-amber-50"
    >
      {copied ? "Kopyalandı" : label}
    </button>
  );
}
