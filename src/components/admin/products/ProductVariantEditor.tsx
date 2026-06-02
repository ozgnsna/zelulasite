"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductFormVariant } from "@/components/admin/products/ProductFormTypes";

type Row = { id?: string; label: string; stock: string };

const RING_SIZE_PRESETS = ["6", "7", "8", "9", "10", "11", "12", "13"];

/**
 * Yüzük gibi ürünlerde ölçü/varyant editörü. Yalnızca seçili kategori
 * `ringCategoryIds` içindeyse görünür. Satırları gizli `variants_json` alanına yazar.
 */
export function ProductVariantEditor({
  ringCategoryIds,
  initialVariants = [],
  categorySelectId = "product-category",
}: {
  ringCategoryIds: string[];
  initialVariants?: ProductFormVariant[];
  categorySelectId?: string;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialVariants.map((v) => ({ id: v.id, label: v.label, stock: String(v.stock_quantity ?? 0) })),
  );
  const [visible, setVisible] = useState(false);

  const ringSet = useMemo(() => new Set(ringCategoryIds), [ringCategoryIds]);

  useEffect(() => {
    const select = document.getElementById(categorySelectId) as HTMLSelectElement | null;
    if (!select) return;
    const sync = () => setVisible(ringSet.has(select.value));
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, [categorySelectId, ringSet]);

  const totalStock = rows.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.stock) || 0)), 0);

  const serialized = JSON.stringify(
    rows
      .map((r) => ({
        id: r.id,
        label: r.label.trim(),
        stock_quantity: Math.max(0, Math.floor(Number(r.stock) || 0)),
      }))
      .filter((r) => r.label.length > 0),
  );

  const addRow = (label = "") =>
    setRows((prev) => (prev.some((r) => r.label.trim() === label.trim() && label.trim() !== "") ? prev : [...prev, { label, stock: "0" }]));
  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  if (!visible) {
    // Görünmese bile mevcut varyantları korumak için JSON'u taşı (kategori ölçüyse uygulanır).
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-[#e8dfd3]/80 bg-[#fffdf9] p-4 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)]">
      <input type="hidden" name="variants_json" value={serialized} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100/90 pb-3">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-stone-900">Ölçü / varyant (yüzük)</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            Her ölçünün kendi stoğu olur. Müşteri üründe ölçü seçer; stok ona göre düşer. Toplam ürün stoğu
            ölçülerin toplamı olur ({totalStock} adet).
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500">Hızlı ekle:</span>
        {RING_SIZE_PRESETS.map((s) => {
          const exists = rows.some((r) => r.label.trim() === s);
          return (
            <button
              key={s}
              type="button"
              disabled={exists}
              onClick={() => addRow(s)}
              className="rounded-md border border-[#e2d6c4] bg-white px-2 py-1 text-[11px] font-medium text-stone-700 transition hover:border-[#c6a15b]/60 hover:bg-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {s}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-3 py-3 text-[11px] text-stone-500">
          Henüz ölçü eklenmedi. Yukarıdan hızlı ekleyebilir veya «Ölçü ekle» ile manuel girebilirsiniz.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-end gap-2 rounded-lg border border-stone-200/70 bg-white p-2">
              <div className="flex-1">
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-stone-500">
                  Ölçü
                </label>
                <input
                  type="text"
                  value={r.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="örn. 7"
                  className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-[#c6a15b]"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-stone-500">
                  Stok
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={r.stock}
                  onChange={(e) => updateRow(i, { stock: e.target.value.replace(/[^\d]/g, "") })}
                  className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm font-semibold tabular-nums text-stone-900 outline-none focus:border-[#c6a15b]"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Ölçüyü kaldır"
                className="mb-0.5 rounded-md border border-stone-200 px-2 py-1.5 text-[11px] font-medium text-stone-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => addRow("")}
        className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-800 transition hover:bg-stone-50"
      >
        + Ölçü ekle
      </button>
    </section>
  );
}
