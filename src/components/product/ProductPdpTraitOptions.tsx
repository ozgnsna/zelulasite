"use client";

import type { PdpTraitGroup } from "@/lib/storefront/pdp-traits";
import { cn } from "@/lib/utils";

type Props = {
  groups: PdpTraitGroup[];
};

/** Renk + materyal — tek satır, içerik genişliği (tam sütuna yayılmaz). */
export function ProductPdpTraitOptions({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <div
      className="w-max max-w-full rounded-2xl border border-[#e8dfd2]/90 bg-white px-4 py-3"
      aria-label="Ürün özellikleri"
    >
      <div className="flex flex-row flex-nowrap items-start gap-5 sm:gap-6">
        {groups.map((group, index) => {
          const selected = group.options.find((o) => o.id === group.selectedId) ?? group.options[0];
          return (
            <div
              key={group.key}
              className={cn(
                "flex shrink-0 flex-col gap-1.5",
                index > 0 && "border-l border-[#ebe6df] pl-5 sm:pl-6",
              )}
            >
              <p className="whitespace-nowrap text-[12px] text-stone-700 sm:text-[13px]">
                <span className="font-semibold text-stone-800">{group.label}:</span>{" "}
                <span className="font-medium text-stone-900">{selected?.label}</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="list">
                {group.options.map((opt) => {
                  const isSelected = opt.id === group.selectedId;
                  return (
                    <span
                      key={opt.id}
                      role="listitem"
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-[12px] font-medium transition sm:text-[13px]",
                        isSelected
                          ? "border-[#c6a15b] bg-[#fff9f0] text-[#7d5f35] shadow-[0_0_0_1px_rgba(198,161,91,0.35)]"
                          : "border-[#e3d8ca] bg-[#faf8f5] text-stone-600",
                      )}
                    >
                      {opt.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
