"use client";

import type { PdpTraitGroup } from "@/lib/storefront/pdp-traits";
import { cn } from "@/lib/utils";

type Props = {
  groups: PdpTraitGroup[];
};

/** Renk / materyal — bitişik spec hücreleri (Trendyol tarzı, tek satır). */
export function ProductPdpTraitOptions({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <div
      className="inline-flex overflow-hidden rounded-2xl border border-[#e8dfd2] bg-[#fffdfb] shadow-[0_2px_12px_rgba(62,53,42,0.05)]"
      style={{ width: "fit-content" }}
      aria-label="Ürün özellikleri"
    >
      {groups.map((group, index) => {
        const selected = group.options.find((o) => o.id === group.selectedId) ?? group.options[0];
        const multi = group.options.length > 1;

        return (
          <div
            key={group.key}
            className={cn(
              "flex min-w-[7.5rem] flex-col gap-1.5 px-3.5 py-2.5 sm:min-w-[8.25rem] sm:px-4 sm:py-3",
              index > 0 && "border-l border-[#ebe6df]",
            )}
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-500">
              {group.label}
            </span>

            {multi ? (
              <div className="flex flex-wrap gap-1.5" role="list">
                {group.options.map((opt) => {
                  const isSelected = opt.id === group.selectedId;
                  return (
                    <span
                      key={opt.id}
                      role="listitem"
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-[32px] items-center justify-center rounded-lg border px-2.5 py-1 text-[12px] font-medium sm:text-[13px]",
                        isSelected
                          ? "border-[#c6a15b] bg-[#fff9f0] text-[#7d5f35]"
                          : "border-[#e8dfd2] bg-white text-stone-600",
                      )}
                    >
                      {opt.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] font-semibold leading-tight text-stone-900 sm:text-sm">
                {selected?.label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
