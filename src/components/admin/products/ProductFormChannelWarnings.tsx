"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type TrendyolStatus = "ready" | "missing" | "disabled";

type Snapshot = {
  status: TrendyolStatus;
  missing: string[];
  stock: number;
  sitePrice: number;
  trendyolSalePrice: number;
};

function readVal(id: string): string {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return "";
}

function readChecked(id: string): boolean {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : false;
}

function missingFieldLabels(keys: string[]) {
  const map: Record<string, string> = {
    trendyol_sale_price: "Trendyol satış fiyatı",
    trendyol_barcode: "Trendyol barkod",
    trendyol_stock_code: "Trendyol stok kodu",
    product_sku: "SKU",
    trendyol_category_id: "Trendyol kategori ID",
    trendyol_brand: "Trendyol marka",
    trendyol_vat_rate: "Trendyol KDV",
    stock_quantity: "Ortak stok",
  };
  return keys.map((k) => map[k] ?? k);
}

function targetIdsForMissingKey(key: string): string[] {
  if (key === "stock_quantity") return ["product-stock_quantity", "product-stock"];
  if (key === "product_sku") return ["product-sku"];
  if (key === "trendyol_sale_price") return ["product-section-trendyol-prices", "trendyol_sale_price"];
  if (key === "trendyol_list_price") return ["product-section-trendyol-prices", "trendyol_list_price"];
  return [key];
}

function focusById(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function jumpToMissingField(key: string) {
  const targetIds = targetIdsForMissingKey(key);
  const prefersTrendyolSection =
    key.startsWith("trendyol_") && key !== "trendyol_sale_price" && key !== "trendyol_list_price";
  const trendyolSection = document.getElementById("product-section-trendyol");
  if (prefersTrendyolSection && trendyolSection instanceof HTMLDetailsElement && !trendyolSection.open) {
    trendyolSection.open = true;
  }
  const target = targetIds
    .map((id) => document.getElementById(id))
    .find((el): el is HTMLElement => Boolean(el instanceof HTMLElement));
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  requestAnimationFrame(() => {
    for (const id of targetIds) {
      if (focusById(id)) break;
    }
  });
}

function computeSnapshot(): Snapshot {
  const trendyolActive = readChecked("trendyol_active");
  const stock = Number(readVal("product-stock"));
  const sitePrice = Number(readVal("product-price"));
  const trendyolSalePrice = Number(readVal("trendyol_sale_price"));

  if (!trendyolActive) {
    return {
      status: "disabled",
      missing: [],
      stock,
      sitePrice,
      trendyolSalePrice,
    };
  }

  const missing: string[] = [];
  if (!(trendyolSalePrice > 0)) missing.push("trendyol_sale_price");
  if (!readVal("trendyol_barcode").trim()) missing.push("trendyol_barcode");
  if (!readVal("trendyol_stock_code").trim() && !readVal("product-sku").trim()) {
    missing.push("trendyol_stock_code", "product_sku");
  }
  if (!readVal("trendyol_category_id").trim()) missing.push("trendyol_category_id");
  if (!readVal("trendyol_brand").trim()) missing.push("trendyol_brand");
  if (!readVal("trendyol_vat_rate").trim()) missing.push("trendyol_vat_rate");
  if (!(stock > 0)) missing.push("stock_quantity");

  return {
    status: missing.length > 0 ? "missing" : "ready",
    missing,
    stock,
    sitePrice,
    trendyolSalePrice,
  };
}

function useChannelSnapshot(formId: string) {
  const [snap, setSnap] = useState<Snapshot>({
    status: "disabled",
    missing: [],
    stock: 0,
    sitePrice: 0,
    trendyolSalePrice: 0,
  });

  const tick = useCallback(() => {
    setSnap(computeSnapshot());
  }, []);

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

  return snap;
}

export function TrendyolStatusBadge({ formId }: { formId: string }) {
  const snap = useChannelSnapshot(formId);
  const tone = snap.status === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : snap.status === "missing" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-stone-100 text-stone-600 border-stone-200";
  const label = snap.status === "ready" ? "Hazır" : snap.status === "missing" ? "Eksik" : "Kapalı";
  return <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", tone)}>{label}</span>;
}

export function TrendyolWarningsPanel({ formId }: { formId: string }) {
  const snap = useChannelSnapshot(formId);
  const readinessFail = snap.status === "missing";
  const isStockCritical = Number.isFinite(snap.stock) && snap.stock <= 2;
  const hasPriceWarning =
    snap.status !== "disabled" &&
    Number.isFinite(snap.trendyolSalePrice) &&
    Number.isFinite(snap.sitePrice) &&
    snap.trendyolSalePrice > 0 &&
    snap.sitePrice > 0 &&
    snap.trendyolSalePrice < snap.sitePrice;

  return (
    <div className="space-y-2.5">
      {readinessFail ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-semibold">Trendyol’a gönderilemez</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {snap.missing.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => jumpToMissingField(key)}
                className="rounded border border-rose-200/70 bg-white/70 px-1.5 py-0.5 text-[11px] text-rose-700 underline decoration-rose-300 underline-offset-2 hover:bg-white"
              >
                {missingFieldLabels([key])[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {isStockCritical ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">⚠️ Stok kritik seviyede</div>
      ) : null}
      {hasPriceWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Trendyol fiyatı site fiyatından düşük</div>
      ) : null}
      <button
        type="button"
        disabled={readinessFail}
        title={readinessFail ? "Eksik alanları tamamla" : "Hazır"}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm font-medium transition",
          readinessFail
            ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        )}
      >
        Trendyol’a gönder
      </button>
    </div>
  );
}

export function StockWarningInline({ formId }: { formId: string }) {
  const snap = useChannelSnapshot(formId);
  if (!Number.isFinite(snap.stock)) return null;
  if (snap.stock <= 0) return <p className="mt-1 text-xs font-medium text-rose-700">Stok yok – ürün yayında olamaz</p>;
  if (snap.stock <= 2) return <p className="mt-1 text-xs font-medium text-amber-700">⚠️ Kritik stok</p>;
  return null;
}
