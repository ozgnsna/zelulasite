import { TrendyolBrandSearchPanel } from "@/components/admin/TrendyolBrandSearchPanel";
import { adminSectionCard, adminSectionSubtitle, adminSectionTitle } from "@/components/admin/products/adminFieldClasses";

export function AdminTrendyolBrandSection() {
  return (
    <details id="trendyol-marka" className={`${adminSectionCard} group mb-8`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>Marka ID aracı</h2>
            <p className={adminSectionSubtitle}>
              Ürün formundaki «Marka ID» alanı için Trendyol API üzerinden marka adıyla arama yapın.
            </p>
          </div>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] text-stone-500 group-open:hidden">
            Aç
          </span>
          <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] text-stone-500 group-open:inline">
            Kapat
          </span>
        </div>
      </summary>
      <div className="mt-4 border-t border-stone-100 pt-4">
        <TrendyolBrandSearchPanel targetInputId="trendyol-brand-id-copy-target" />
        <input
          id="trendyol-brand-id-copy-target"
          type="text"
          readOnly
          placeholder="Arama sonucundan «Bu ID'yi yaz» ile buraya gelir"
          className="mt-3 w-full rounded-xl border border-dashed border-[#e7ded2] bg-[#faf8f5] px-3 py-2.5 font-mono text-xs text-stone-800"
        />
      </div>
    </details>
  );
}
