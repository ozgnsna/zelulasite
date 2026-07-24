"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

type Snapshot = {
  isActive: boolean;
  price: number;
  compare: number;
  cost: number;
  hasCost: boolean;
  trendyolSale: number;
  stock: number;
};

function readValue(id: string): string {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return "";
}

function readChecked(id: string): boolean {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement && el.checked;
}

function asNum(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeSnap(): Snapshot {
  const costRaw = readValue("product-cost-price");
  const costNum = asNum(costRaw);
  const hasCost = costRaw.trim() !== "" && Number.isFinite(costNum) && costNum > 0;
  return {
    isActive: readChecked("product-is-active"),
    price: asNum(readValue("product-price")),
    compare: asNum(readValue("product-compare")),
    cost: costNum,
    hasCost,
    trendyolSale: asNum(readValue("trendyol_sale_price")),
    stock: asNum(readValue("product-stock")),
  };
}

function formatTry(n: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
}

type ProductPricingAssistantProps = {
  formId: string;
  initialCostPrice?: number | null;
};

export function ProductPricingAssistant({ formId, initialCostPrice }: ProductPricingAssistantProps) {
  const [snap, setSnap] = useState<Snapshot>({
    isActive: false,
    price: 0,
    compare: 0,
    cost: 0,
    hasCost: false,
    trendyolSale: 0,
    stock: 0,
  });

  const tick = useCallback(() => setSnap(computeSnap()), []);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const raf = requestAnimationFrame(tick);
    form.addEventListener("input", tick);
    form.addEventListener("change", tick);
    return () => {
      cancelAnimationFrame(raf);
      form.removeEventListener("input", tick);
      form.removeEventListener("change", tick);
    };
  }, [formId, tick]);

  const discountPercent = useMemo(() => {
    if (!(snap.price > 0) || !(snap.compare > snap.price)) return 0;
    return Math.round(((snap.compare - snap.price) / snap.compare) * 100);
  }, [snap.compare, snap.price]);

  const hasDiscount = discountPercent > 0;
  const profit = snap.hasCost ? snap.price - snap.cost : null;
  const marginPercent =
    snap.hasCost && snap.price > 0 && profit != null ? Math.round((profit / snap.price) * 1000) / 10 : null;

  const stockLabel =
    snap.stock <= 0 ? "Yok" : snap.stock <= 2 ? "Kritik" : `${Math.max(0, Math.trunc(snap.stock))} adet`;

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border border-[#ece4d9]/70 bg-[#fcfaf7] p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/85">Ürün durumu</p>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <span
            className={cn(
              "rounded-md px-2 py-1 text-center",
              snap.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600",
            )}
          >
            Yayın: {snap.isActive ? "Yayında" : "Taslak"}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-1 text-center",
              snap.stock <= 2 ? "bg-amber-50 text-amber-800" : "bg-stone-100 text-stone-600",
            )}
          >
            Stok: {stockLabel}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-1 text-center",
              hasDiscount ? "bg-[#f8efe0] text-amber-800" : "bg-stone-100 text-stone-600",
            )}
          >
            İndirim: {hasDiscount ? `%${discountPercent}` : "Yok"}
          </span>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-[#ece4d9]/70 bg-[#fcfaf7] p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/85">Maliyet &amp; kâr</p>
        <div className="space-y-1.5 rounded-lg border border-[#eee6dc] bg-white/80 p-2">
          <label className="text-[11px] font-medium text-stone-600" htmlFor="product-cost-price">
            Toptancı alış fiyatı (₺)
          </label>
          <input
            id="product-cost-price"
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialCostPrice ?? ""}
            placeholder="örn. 350"
            inputMode="decimal"
            className="w-full rounded-lg border border-[#e7ded2] bg-white px-2.5 py-1.5 text-xs text-stone-700 outline-none focus:border-[#c9a06e]"
          />
          <p className="text-[10px] leading-snug text-stone-400">
            Sadece admin panelinde görünür. Birim maliyet — KDV dahil veya hariç, girdiğiniz tutarı kaydedin.
          </p>
          {snap.hasCost && profit != null ? (
            <p className="text-xs text-stone-700">
              Brüt kâr: {formatTry(profit)} ₺
              {marginPercent != null ? ` · Marj %${marginPercent}` : null}
            </p>
          ) : (
            <p className="text-[10px] text-stone-400">Alış fiyatı girince site satış fiyatına göre kâr hesaplanır.</p>
          )}
        </div>
        {hasDiscount ? (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-2.5 py-2">
            <p className="text-xs font-semibold text-amber-800">%{discountPercent} indirim uygulanıyor</p>
            <p className="mt-0.5 text-[11px] text-amber-700/80">Liste fiyatına göre kampanya etkisi aktif.</p>
          </div>
        ) : null}
        {snap.price > 0 && snap.trendyolSale > 0 && snap.price < snap.trendyolSale ? (
          <p className="text-xs text-amber-800">Zelula fiyatı Trendyol’dan düşük</p>
        ) : null}
        {snap.compare > 0 && snap.price > 0 && snap.price < snap.compare && discountPercent < 10 ? (
          <p className="text-xs text-amber-800">İndirim oranı düşük</p>
        ) : null}
      </div>
    </div>
  );
}
