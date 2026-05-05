"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  editHref: string;
  hints: string[];
};

export function AdminProductOptimizePanel({ editHref, hints }: Props) {
  const [open, setOpen] = useState(false);
  if (hints.length === 0) {
    return (
      <Link
        href={`${editHref}${editHref.includes("?") ? "&" : "?"}quickOptimize=1`}
        className="inline-flex w-full items-center justify-center rounded-lg border border-violet-300/85 bg-violet-50/90 px-2.5 py-1.5 text-[11px] font-bold text-violet-950 shadow-sm transition hover:border-violet-400 hover:bg-violet-100/90 sm:w-auto"
      >
        Optimize
      </Link>
    );
  }
  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center rounded-lg border border-violet-400/85 bg-violet-50/95 px-2.5 py-1.5 text-[11px] font-bold text-violet-950 shadow-sm transition hover:border-violet-500 hover:bg-violet-100 sm:w-auto"
      >
        Optimize
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default bg-transparent" aria-label="Kapat" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-[min(100vw-2rem,18rem)] rounded-xl border border-violet-200/90 bg-white p-3 shadow-[0_8px_28px_-6px_rgba(30,27,75,0.18)] ring-1 ring-violet-900/5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">Fiyat · Başlık · Görsel</p>
            <ul className="mt-2 space-y-1.5 text-[11px] font-medium leading-snug text-stone-800">
              {hints.map((h) => (
                <li key={h} className="flex gap-1.5">
                  <span className="shrink-0 text-violet-600" aria-hidden>
                    →
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`${editHref}${editHref.includes("?") ? "&" : "?"}quickOptimize=1`}
              className="mt-3 block rounded-lg bg-violet-700 px-2.5 py-2 text-center text-[11px] font-bold text-white shadow-sm transition hover:bg-violet-800"
              onClick={() => setOpen(false)}
            >
              Düzenle → uygula
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
