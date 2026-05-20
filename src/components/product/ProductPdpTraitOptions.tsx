"use client";

import type { PdpTraitGroup } from "@/lib/storefront/pdp-traits";
import { cn } from "@/lib/utils";
import { Fragment } from "react";

type Props = {
  groups: PdpTraitGroup[];
};

/**
 * Renk + materyal — tek yatay şerit (iki sütun / tam genişlik yok).
 * Örnek: Renk [GRİ] · Materyal [Çelik]
 */
export function ProductPdpTraitOptions({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-2 rounded-2xl border border-[#e8dfd2]/90 bg-white px-3.5 py-2.5 sm:gap-x-3 sm:px-4 sm:py-3"
      style={{ width: "fit-content" }}
      aria-label="Ürün özellikleri"
    >
      {groups.map((group, index) => {
        const selected = group.options.find((o) => o.id === group.selectedId) ?? group.options[0];
        return (
          <Fragment key={group.key}>
            {index > 0 ? (
              <span className="select-none text-[13px] text-[#d4c9b8]" aria-hidden>
                ·
              </span>
            ) : null}
            <div className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
              <span className="whitespace-nowrap text-[12px] font-semibold text-stone-800 sm:text-[13px]">
                {group.label}
              </span>
              {group.options.map((opt) => {
                const isSelected = opt.id === group.selectedId;
                return (
                  <span
                    key={opt.id}
                    className={cn(
                      "inline-flex min-h-[34px] items-center justify-center rounded-xl border px-3 py-1.5 text-[12px] font-medium sm:text-[13px]",
                      isSelected
                        ? "border-[#c6a15b] bg-[#fff9f0] text-[#7d5f35] shadow-[0_0_0_1px_rgba(198,161,91,0.35)]"
                        : "border-[#e3d8ca] bg-[#faf8f5] text-stone-600",
                    )}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    {opt.label}
                  </span>
                );
              })}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
