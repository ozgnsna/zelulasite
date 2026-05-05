"use client";

import {
  FillTrendyolFromSiteButton,
  SkuFromCategoryButton,
  SlugFromNameButton,
} from "@/components/admin/products/ProductFormSmartActions";
import type { ProductFormCategoryAttributeDefinition } from "@/components/admin/products/ProductFormTypes";
import { computeMissingRequiredAttributes } from "@/lib/marketplaces/trendyol/categories";
import { evaluateTrendyolReadiness, type TrendyolCategoryReadinessInput } from "@/lib/marketplaces/trendyol/readiness";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const PREVIEW_URL_ID = "product-image-preview-url";

const SECTION_NAV: { id: string; label: string }[] = [
  { id: "product-section-basic", label: "Ürün bilgileri" },
  { id: "product-section-images", label: "Görseller" },
  { id: "product-section-trendyol", label: "Trendyol" },
  { id: "product-section-catalog", label: "Katalog" },
  { id: "product-section-status", label: "Durum" },
];

function scrollToProductSection(sectionId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(sectionId);
  if (!el) return;
  if (el instanceof HTMLDetailsElement && !el.open) {
    el.open = true;
  }
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function ProductFormSectionNav({ variant }: { variant: "desktop" | "mobile" }) {
  const chipClass =
    "shrink-0 whitespace-nowrap rounded-full border border-[#e7ded2]/70 bg-[#fdfcfa]/90 px-2.5 py-1 text-[10px] font-medium text-stone-600/95 transition-[color,background-color,border-color] hover:border-[#c9a06e]/50 hover:bg-white hover:text-stone-800";
  const linkClass =
    "w-full rounded-md py-0.5 text-left text-[10px] font-medium text-stone-500/95 transition-colors hover:bg-[#fdfcfa]/80 hover:text-amber-900/85";

  if (variant === "mobile") {
    return (
      <nav className="mb-3 border-b border-[#e7ded2]/35 pb-3" aria-label="Form bölümleri">
        <ul className="flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTION_NAV.map(({ id, label }) => (
            <li key={id} className="shrink-0">
              <button type="button" className={chipClass} onClick={() => scrollToProductSection(id)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="mb-3 border-b border-[#e7ded2]/35 pb-3" aria-label="Form bölümleri">
      <ul className="flex flex-col gap-0.5">
        {SECTION_NAV.map(({ id, label }) => (
          <li key={id}>
            <button type="button" className={linkClass} onClick={() => scrollToProductSection(id)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function fieldVal(id: string): string {
  if (typeof document === "undefined") return "";
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return "";
}

function fieldChecked(id: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement && el.type === "checkbox" && el.checked;
}

function buildLiveCategoryReadiness(defs: ProductFormCategoryAttributeDefinition[] | undefined): TrendyolCategoryReadinessInput | null {
  if (!defs || defs.length === 0) return null;
  const required = defs.filter((d) => d.required);
  if (required.length === 0) {
    return { resolved: true, requiredCount: 0, missingRequired: [] };
  }
  const raw = fieldVal("trendyol_category_attributes");
  let parsed: unknown = [];
  try {
    const j = JSON.parse(raw);
    if (!Array.isArray(j)) throw new Error("not array");
    parsed = j;
  } catch {
    return {
      resolved: true,
      requiredCount: required.length,
      missingRequired: required.map((d) => ({ attributeId: d.attributeId, name: d.name })),
    };
  }
  const { missing } = computeMissingRequiredAttributes(defs, parsed);
  return {
    resolved: true,
    requiredCount: required.length,
    missingRequired: missing.map((m) => ({ attributeId: m.attributeId, name: m.name })),
  };
}

export type ReadinessSummarySnap = {
  site: "ready" | "missing";
  trendyol: "ready" | "missing" | "disabled";
  image: "ready" | "missing";
};

function computeSnapshot(
  formId: string,
  initialImageCount: number,
  categoryDefinitions?: ProductFormCategoryAttributeDefinition[],
): ReadinessSummarySnap {
  if (typeof document === "undefined") {
    return {
      site: "missing",
      trendyol: "disabled",
      image: initialImageCount > 0 ? "ready" : "missing",
    };
  }
  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) {
    return {
      site: "missing",
      trendyol: "disabled",
      image: "missing",
    };
  }

  const siteOk =
    fieldVal("product-name").trim() !== "" &&
    fieldVal("product-slug").trim() !== "" &&
    fieldVal("product-short-desc").trim() !== "" &&
    fieldVal("product-full-desc").trim() !== "" &&
    fieldVal("product-sku").trim() !== "" &&
    fieldVal("product-category").trim() !== "" &&
    Number(fieldVal("product-price")) > 0 &&
    fieldVal("product-stock").trim() !== "" &&
    !Number.isNaN(Number(fieldVal("product-stock"))) &&
    Number(fieldVal("product-stock")) >= 0;

  const preview = fieldVal(PREVIEW_URL_ID).trim();
  const imageOk = initialImageCount > 0 || /^https?:\/\//i.test(preview);

  const tyInput = {
    is_active: fieldChecked("product-is-active"),
    trendyol_active: fieldChecked("trendyol_active"),
    trendyol_barcode: fieldVal("trendyol_barcode").trim() || null,
    trendyol_stock_code: fieldVal("trendyol_stock_code").trim() || null,
    sku: fieldVal("product-sku").trim() || null,
    trendyol_brand: fieldVal("trendyol_brand").trim() || null,
    trendyol_category_id: fieldVal("trendyol_category_id").trim() || null,
    trendyol_sale_price: fieldVal("trendyol_sale_price").trim() === "" ? null : Number(fieldVal("trendyol_sale_price")),
    trendyol_quantity: fieldVal("trendyol_quantity").trim() === "" ? null : Number(fieldVal("trendyol_quantity")),
    stock_quantity: Number(fieldVal("product-stock")),
    trendyol_vat_rate: fieldVal("trendyol_vat_rate").trim() === "" ? null : Number(fieldVal("trendyol_vat_rate")),
  };

  const cat = buildLiveCategoryReadiness(categoryDefinitions);
  const ty = evaluateTrendyolReadiness(tyInput, cat);

  return {
    site: siteOk ? "ready" : "missing",
    trendyol: ty.status,
    image: imageOk ? "ready" : "missing",
  };
}

function StatusDot({ tone }: { tone: "ready" | "missing" | "disabled" }) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-block size-1.5 shrink-0 rounded-full",
        tone === "ready" && "bg-emerald-600/45",
        tone === "missing" && "bg-amber-500/55",
        tone === "disabled" && "bg-stone-400/55",
      )}
      aria-hidden
    />
  );
}

function Row({
  dotTone,
  label,
  value,
}: {
  dotTone: "ready" | "missing" | "disabled";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug text-stone-700">
      <StatusDot tone={dotTone} />
      <div>
        <span className="text-stone-500/90">{label}</span>
        <span className="ml-1 font-medium text-stone-800">{value}</span>
      </div>
    </div>
  );
}

export function ProductFormReadinessSticky({
  formId,
  variant,
  initialImageCount,
  categoryDefinitions,
}: {
  formId: string;
  variant: "desktop" | "mobile";
  initialImageCount: number;
  categoryDefinitions?: ProductFormCategoryAttributeDefinition[];
}) {
  const [snap, setSnap] = useState<ReadinessSummarySnap>({
    site: "missing",
    trendyol: "disabled",
    image: initialImageCount > 0 ? "ready" : "missing",
  });

  const tick = useCallback(() => {
    setSnap(computeSnapshot(formId, initialImageCount, categoryDefinitions));
  }, [formId, initialImageCount, categoryDefinitions]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const rafId = requestAnimationFrame(tick);
    form.addEventListener("input", tick);
    form.addEventListener("change", tick);
    return () => {
      cancelAnimationFrame(rafId);
      form.removeEventListener("input", tick);
      form.removeEventListener("change", tick);
    };
  }, [formId, tick]);

  const siteLabel = snap.site === "ready" ? "Hazır" : "Eksik";
  const tyLabel = snap.trendyol === "ready" ? "Hazır" : snap.trendyol === "missing" ? "Eksik" : "Kapalı";
  const imgLabel = snap.image === "ready" ? "Var" : "Yok";

  const tyDot: "ready" | "missing" | "disabled" =
    snap.trendyol === "ready" ? "ready" : snap.trendyol === "missing" ? "missing" : "disabled";

  return (
    <aside
      className={cn(
        "rounded-2xl border border-[#e7ded2]/90 bg-white/95 p-3 shadow-[0_1px_2px_rgba(28,25,23,0.05)] backdrop-blur-sm",
        variant === "desktop" && "hidden lg:block lg:sticky lg:top-24 lg:z-10 lg:self-start",
        variant === "mobile" && "lg:hidden",
      )}
      aria-label="Trendyol hazırlık kontrolü"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500/85">Trendyol hazırlık kontrolü</p>
      <ProductFormSectionNav variant={variant} />
      <div className="mt-0 space-y-2 border-b border-[#e7ded2]/40 pb-3">
        <Row dotTone={snap.site === "ready" ? "ready" : "missing"} label="Site:" value={siteLabel} />
        <Row dotTone={tyDot} label="Trendyol:" value={tyLabel} />
        <Row dotTone={snap.image === "ready" ? "ready" : "missing"} label="Görsel:" value={imgLabel} />
      </div>
      <div className="mt-3 flex flex-col gap-1.5 [&_button]:w-full [&_button]:justify-center">
        <FillTrendyolFromSiteButton />
        <SlugFromNameButton />
        <SkuFromCategoryButton />
      </div>
    </aside>
  );
}
