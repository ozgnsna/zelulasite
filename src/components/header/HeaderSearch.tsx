"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    setOpen(false);
    router.push(`/urunler?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Ürün ara"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e5dcd0]/90 bg-white/90 text-stone-800 shadow-sm transition hover:border-[color:var(--brand-gold)]/35 hover:text-stone-900"
      >
        <Search className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-[45] rounded-2xl border border-[#e8dfd3] bg-[#fffdfb] shadow-[0_16px_40px_rgba(55,48,40,0.12)]">
          <div className="px-3 py-3">
            <form onSubmit={submit} className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="search"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ürün, materyal veya renk ara…"
                  aria-label="Ürün ara"
                  className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-stone-400"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                Ara
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Aramayı kapat"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition hover:bg-stone-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
