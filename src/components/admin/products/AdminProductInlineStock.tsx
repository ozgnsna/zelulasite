"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductStockInline } from "@/app/actions/admin";

export function AdminProductInlineStock({
  productId,
  initialStock,
  hasVariants = false,
}: {
  productId: string;
  initialStock: number;
  hasVariants?: boolean;
}) {
  const router = useRouter();
  const [stock, setStock] = useState<number>(initialStock);
  const [value, setValue] = useState<string>(String(initialStock));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStock(initialStock);
    setValue(String(initialStock));
  }, [initialStock]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (hasVariants) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-stone-200/70 bg-stone-50/70 px-1.5 py-1 text-[10px] text-stone-500" title="Stok varyanttan yönetilir">
        Stok {initialStock}
      </span>
    );
  }

  function commit(next: number) {
    if (next === stock) {
      setEditing(false);
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateProductStockInline(productId, next);
      if (res.ok) {
        const applied = res.stock ?? next;
        setStock(applied);
        setValue(String(applied));
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        router.refresh();
      } else {
        setError(res.error ?? "Hata");
      }
    });
  }

  function save() {
    const next = Math.trunc(Number(value));
    if (!Number.isFinite(next) || next < 0) {
      setError("Geçersiz");
      return;
    }
    commit(next);
  }

  function step(delta: number) {
    const base = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : stock;
    const next = Math.max(0, base + delta);
    setValue(String(next));
    commit(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Stok düzenle"
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium tabular-nums transition-colors ${
          saved
            ? "border-emerald-300/70 bg-emerald-50 text-emerald-800"
            : stock === 0
              ? "border-rose-200/70 bg-rose-50/70 text-rose-800 hover:bg-rose-100/70"
              : "border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50"
        }`}
      >
        <span>Stok {stock}</span>
        <span aria-hidden className="text-stone-400">{saved ? "✓" : "✎"}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={pending}
          className="h-6 w-6 rounded-md border border-stone-200 bg-white text-[12px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          aria-label="Azalt"
        >
          −
        </button>
        <input
          ref={inputRef}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setValue(String(stock));
              setEditing(false);
              setError(null);
            }
          }}
          className="h-6 w-12 rounded-md border border-stone-300 bg-white px-1 text-center text-[11px] tabular-nums text-stone-900 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300/60"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={pending}
          className="h-6 w-6 rounded-md border border-stone-200 bg-white text-[12px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          aria-label="Artır"
        >
          +
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-6 rounded-md border border-stone-800 bg-stone-900 px-2 text-[10px] font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {pending ? "…" : "Kaydet"}
        </button>
      </span>
      {error ? <span className="text-[9px] font-medium text-rose-700">{error}</span> : null}
    </span>
  );
}
