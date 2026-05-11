"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function formatTr(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return null;
  }
}

export function ProductFormDraftStatus({
  formId,
  serverUpdatedAt,
}: {
  formId: string;
  /** Sunucudaki `products.updated_at` (ISO). */
  serverUpdatedAt?: string | null;
}) {
  const [dirty, setDirty] = useState(false);
  const [lastEdit, setLastEdit] = useState<number | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const mark = () => {
      setDirty(true);
      setLastEdit(Date.now());
    };
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
    };
  }, [formId]);

  const savedLabel = serverUpdatedAt ? formatTr(serverUpdatedAt) : null;

  return (
    <div className="flex items-center gap-2 text-[11px] text-stone-500">
      <span
        className={cn(
          "inline-block size-1.5 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-white transition-colors",
          dirty ? "bg-amber-400 ring-amber-200/80" : "bg-emerald-400/90 ring-emerald-100",
        )}
        aria-hidden
      />
      {dirty ? (
        <span className="text-stone-600">
          Taslak
          {lastEdit ? (
            <span className="text-stone-400">
              {" "}
              · {new Date(lastEdit).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </span>
      ) : savedLabel ? (
        <span>
          Son kayıt: <span className="font-medium text-stone-700">{savedLabel}</span>
        </span>
      ) : (
        <span>Kaydet ile yayınlanır</span>
      )}
    </div>
  );
}
