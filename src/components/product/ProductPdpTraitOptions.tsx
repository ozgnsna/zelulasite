"use client";

import type { PdpTraitGroup } from "@/lib/storefront/pdp-traits";
import { cn } from "@/lib/utils";

type Props = {
  groups: PdpTraitGroup[];
};

/** Trendyol’a benzer seçili pill’ler; tek SKU’da bilgi amaçlı (seçim sepete gitmez). */
export function ProductPdpTraitOptions({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4" aria-label="Ürün özellikleri">
      {groups.map((group) => {
        const selected = group.options.find((o) => o.id === group.selectedId) ?? group.options[0];
        return (
          <div key={group.key} className="space-y-2">
            <p className="text-[13px] text-stone-800">
              <span className="font-semibold">{group.label}:</span>{" "}
              <span className="font-medium text-stone-900">{selected?.label}</span>
            </p>
            <div className="flex flex-wrap gap-2" role="list">
              {group.options.map((opt) => {
                const isSelected = opt.id === group.selectedId;
                return (
                  <span
                    key={opt.id}
                    role="listitem"
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-[40px] min-w-[3.25rem] items-center justify-center rounded-lg border px-3.5 py-2 text-[13px] font-medium transition",
                      isSelected
                        ? "border-[#c6a15b] bg-[#fff9f0] text-[#7d5f35] shadow-[0_0_0_1px_rgba(198,161,91,0.35)]"
                        : "border-[#e3d8ca] bg-white text-stone-600",
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
  );
}
