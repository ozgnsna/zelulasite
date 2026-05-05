"use client";

import {
  prefetchTrendyolCategoryAttributesForFormAction,
  searchTrendyolCategoriesAction,
} from "@/app/actions/admin";
import { adminField, adminSecondaryButton } from "@/components/admin/products/adminFieldClasses";
import type { TrendyolCategoryLeaf } from "@/lib/marketplaces/trendyol/category-tree";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

type TrendyolCategorySearchPanelProps = {
  /** When true, omits outer card chrome so the panel sits inside a parent group. */
  embedded?: boolean;
};

export function TrendyolCategorySearchPanel({ embedded = false }: TrendyolCategorySearchPanelProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TrendyolCategoryLeaf[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = () => {
    setError(null);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError("En az 2 karakter yazın.");
      return;
    }
    startTransition(async () => {
      const res = await searchTrendyolCategoriesAction(trimmed);
      if (!res.ok) {
        setResults([]);
        setError(res.message);
        return;
      }
      setResults(res.results);
      setError(res.results.length === 0 ? "Eşleşen kategori bulunamadı." : null);
    });
  };

  const selectCategory = (leaf: TrendyolCategoryLeaf) => {
    const el = document.getElementById("trendyol_category_id");
    if (el instanceof HTMLInputElement) {
      el.value = leaf.id;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setError(null);
    startTransition(async () => {
      await prefetchTrendyolCategoryAttributesForFormAction(leaf.id);
    });
  };

  return (
    <div
      className={cn(
        embedded
          ? "space-y-3"
          : "rounded-xl border border-[#e7ded2]/90 bg-[#fdfcfa] p-3 shadow-sm sm:p-4",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-stretch gap-2",
          embedded && "rounded-xl border border-[#e7ded2]/45 bg-white/75 p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] sm:p-2.5",
        )}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="örn. kolye, küpe, yüzük"
          className={cn(adminField, "min-w-[12rem] flex-1 py-2 text-xs sm:text-sm")}
        />
        <button type="button" onClick={runSearch} disabled={pending} className={cn(adminSecondaryButton, "shrink-0 px-4")}>
          Ara
        </button>
      </div>
      {error && results.length === 0 ? (
        <p className="text-[9px] leading-relaxed text-amber-800/55 sm:text-[10px]">{error}</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[#e7ded2]/40 bg-[#fdfcfa]/80 p-2 shadow-inner">
          {results.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-lg border border-[#e7ded2]/35 bg-white/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-stone-800">{r.name}</p>
                <p className="truncate text-[10px] text-stone-500/85">
                  ID: <span className="font-mono text-stone-700">{r.id}</span>
                  {r.path ? <span className="text-stone-400/90"> · {r.path}</span> : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectCategory(r)}
                className={cn(adminSecondaryButton, "shrink-0 px-3 py-1.5 text-[10px]")}
              >
                Bu kategoriyi seç
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
