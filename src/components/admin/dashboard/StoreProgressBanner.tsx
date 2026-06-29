"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "zelula_admin_store_progress_banner_dismissed";

export function StoreProgressBanner({
  progressPct,
  hint,
  incompleteStepLabel,
}: {
  progressPct: number;
  hint: string;
  incompleteStepLabel: string | null;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (progressPct >= 100 || dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e0d5c8] bg-[linear-gradient(90deg,#fffdfb_0%,#f7f4ef_100%)] px-3 py-2.5 shadow-sm ring-1 ring-stone-900/[0.04]">
      <div className="min-w-0 flex-1 text-[12px] leading-snug text-stone-800">
        <span className="font-bold text-stone-950">Mağaza hazırlığı %{progressPct}</span>
        {incompleteStepLabel ? (
          <span className="text-stone-600">
            {" "}
            · Sıradaki: <span className="font-semibold text-stone-800">{incompleteStepLabel}</span>
          </span>
        ) : null}
        <span className="mt-0.5 block text-stone-600">{hint}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* private mode */
          }
          setDismissed(true);
        }}
        className="touch-target shrink-0 rounded-full p-1 text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-800"
        aria-label="Bildirimi kapat"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
