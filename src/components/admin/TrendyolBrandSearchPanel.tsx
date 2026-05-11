"use client";

import { searchTrendyolBrandsByNameAction } from "@/app/actions/admin";
import { adminField, adminSecondaryButton } from "@/components/admin/products/adminFieldClasses";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

type BrandRow = { id: number; name: string };

type TrendyolBrandSearchPanelProps = {
  embedded?: boolean;
  /** Varsayılan: ürün formundaki Marka ID alanı */
  targetInputId?: string;
};

export function TrendyolBrandSearchPanel({
  embedded = false,
  targetInputId = "trendyol_brand",
}: TrendyolBrandSearchPanelProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BrandRow[]>([]);
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
      const res = await searchTrendyolBrandsByNameAction(trimmed);
      if (!res.ok) {
        setResults([]);
        setError(res.message);
        return;
      }
      setResults(res.brands);
      if (res.brands.length === 0) {
        setError(
          "Eşleşen marka bulunamadı. Trendyol bu aramada büyük/küçük harfe duyarlı olabilir; farklı yazım deneyin veya Trendyol Yönetimi sayfasındaki tam marka listesi ipucuna bakın.",
        );
      } else {
        setError(null);
      }
    });
  };

  const applyBrandId = (id: number) => {
    const el = document.getElementById(targetInputId);
    if (el instanceof HTMLInputElement) {
      el.value = String(id);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  return (
    <div
      className={cn(
        embedded
          ? "space-y-3"
          : "rounded-xl border border-[#e7ded2]/90 bg-[#fdfcfa] p-3 shadow-sm sm:p-4",
      )}
    >
      <p className="text-[10px] leading-relaxed text-stone-500 sm:text-[11px]">
        Marka adını yazıp arayın; çıkan satırdaki sayı <strong>Marka ID</strong>dir (panelde görünmez, yalnızca API listesinde vardır).
      </p>
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
          placeholder="örn. markanızın Trendyol’daki tam adı"
          className={cn(adminField, "min-w-[12rem] flex-1 py-2 text-xs sm:text-sm")}
        />
        <button type="button" onClick={runSearch} disabled={pending} className={cn(adminSecondaryButton, "shrink-0 px-4")}>
          Ara
        </button>
      </div>
      {error && results.length === 0 ? (
        <p className="text-[9px] leading-relaxed text-amber-800/80 sm:text-[10px]">{error}</p>
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
                <p className="truncate font-mono text-[10px] text-stone-600">
                  Marka ID: <span className="text-stone-900">{r.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyBrandId(r.id)}
                className={cn(adminSecondaryButton, "shrink-0 px-3 py-1.5 text-[10px]")}
              >
                Bu ID’yi yaz
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
