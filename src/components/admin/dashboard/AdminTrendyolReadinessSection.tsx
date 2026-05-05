import Link from "next/link";
import { TrendyolPayloadPreviewButton } from "@/components/admin/TrendyolPayloadPreviewButton";

type Row = {
  product: {
    id: string;
    name: string;
    sku: string | null;
    is_active: boolean;
    stock_quantity: number | null;
    price: number | null;
    [key: string]: unknown;
  };
  readiness: { status: "ready" | "missing" | "disabled"; missingFields: string[] };
  categoryReadiness: { resolved: boolean; requiredCount: number; missingRequired: { attributeId: number; name: string }[] };
  cacheFresh: boolean;
};

export function AdminTrendyolReadinessSection({
  baseQueryParams,
  trendyolFilter,
  trendyolRowsRaw,
  trendyolRows,
  readyCount,
  missingCount,
  disabledCount,
  syncReadyTrendyolProductsAction,
  refreshTrendyolCategoryAttributesAction,
}: {
  baseQueryParams: string;
  trendyolFilter: string;
  trendyolRowsRaw: Row[];
  trendyolRows: Row[];
  readyCount: number;
  missingCount: number;
  disabledCount: number;
  syncReadyTrendyolProductsAction: (formData: FormData) => Promise<void>;
  refreshTrendyolCategoryAttributesAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide text-stone-800">Trendyol Ürün Hazırlığı</h2>
          <p className="mt-1 text-xs font-light text-stone-500">
            Senkron öncesi zorunlu alan kontrolü. Eksik olanları düzenleyip tekrar kontrol edebilirsin.
          </p>
        </div>
        <form action={syncReadyTrendyolProductsAction}>
          <button className="rounded-lg border border-[#d8c9b1] bg-white px-3 py-1.5 text-xs text-stone-700 hover:border-[#c6a15b]/50">
            Hazır ürünleri Trendyol&apos;a gönder
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <Link
          href={`/admin?${baseQueryParams}&ty=all`}
          className={`rounded-full border px-3 py-1 ${trendyolFilter === "all" ? "border-[#c6a15b]/50 bg-[#faf6ef] text-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
        >
          Tümü ({trendyolRowsRaw.length})
        </Link>
        <Link
          href={`/admin?${baseQueryParams}&ty=ready`}
          className={`rounded-full border px-3 py-1 ${trendyolFilter === "ready" ? "border-[#c6a15b]/50 bg-[#eef7ee] text-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
        >
          Hazır ({readyCount})
        </Link>
        <Link
          href={`/admin?${baseQueryParams}&ty=missing`}
          className={`rounded-full border px-3 py-1 ${trendyolFilter === "missing" ? "border-[#c6a15b]/50 bg-[#faf4ea] text-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
        >
          Eksik bilgi var ({missingCount})
        </Link>
        <Link
          href={`/admin?${baseQueryParams}&ty=disabled`}
          className={`rounded-full border px-3 py-1 ${trendyolFilter === "disabled" ? "border-[#c6a15b]/50 bg-[#f5f3ef] text-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
        >
          Senkron kapalı ({disabledCount})
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {trendyolRows.slice(0, 120).map(({ product: p, readiness, categoryReadiness, cacheFresh }) => {
          const statusLabel =
            readiness.status === "ready" ? "Hazır" : readiness.status === "missing" ? "Eksik bilgi var" : "Senkron kapalı";
          const statusClass =
            readiness.status === "ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : readiness.status === "missing"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-stone-200 bg-stone-100 text-stone-600";
          const stockCode = String((p as Record<string, unknown>).trendyol_stock_code ?? p.sku ?? "");
          const barcode = String((p as Record<string, unknown>).trendyol_barcode ?? "");
          const categoryId = String((p as Record<string, unknown>).trendyol_category_id ?? "");
          const brand = String((p as Record<string, unknown>).trendyol_brand ?? "");
          const salePrice = Number((p as Record<string, unknown>).trendyol_sale_price ?? p.price ?? 0);
          const qty = Number((p as Record<string, unknown>).trendyol_quantity ?? p.stock_quantity ?? 0);
          const vat = Number((p as Record<string, unknown>).trendyol_vat_rate ?? 0);
          const showCategoryPanel = Boolean(categoryId);
          return (
            <div key={p.id} className="rounded-xl border border-stone-200/80 bg-white/80 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-stone-800">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    SKU/StockCode: {stockCode || "—"} · Barcode: {barcode || "—"} · Category: {categoryId || "—"} · Brand:{" "}
                    {brand || "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    Satış: {salePrice} TRY · Stok: {qty} · KDV: {vat || "—"} · Aktif: {p.is_active ? "Evet" : "Hayır"}
                  </p>
                  {showCategoryPanel ? (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Zorunlu özellik:{" "}
                      {categoryReadiness.resolved ? (
                        <span className="tabular-nums text-stone-700">{categoryReadiness.requiredCount}</span>
                      ) : (
                        <span className="text-stone-400">henüz bilinmiyor</span>
                      )}
                      {categoryReadiness.resolved && categoryReadiness.missingRequired.length > 0 ? (
                        <span className="text-amber-800/90">
                          {" "}
                          · Eksik:{" "}
                          {categoryReadiness.missingRequired.map((m) => `${m.name} (${m.attributeId})`).join(", ")}
                        </span>
                      ) : null}
                      {categoryReadiness.resolved ? (
                        <span className="text-stone-400"> · Önbellek: {cacheFresh ? "güncel" : "yenilemen iyi olur"}</span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusClass}`}>{statusLabel}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <TrendyolPayloadPreviewButton productId={p.id} />
                    {showCategoryPanel ? (
                      <form action={refreshTrendyolCategoryAttributesAction}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-stone-300 bg-white px-2 py-1 text-[10px] text-stone-700 hover:bg-stone-50"
                        >
                          Kategori özelliklerini kontrol et
                        </button>
                      </form>
                    ) : null}
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.id)}/edit`}
                      className="rounded border border-stone-300 px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50"
                    >
                      Düzenle
                    </Link>
                  </div>
                </div>
              </div>
              {readiness.missingFields.length > 0 ? (
                <p className="mt-1.5 text-[11px] text-amber-800/80">Eksikler: {readiness.missingFields.join(", ")}</p>
              ) : null}
            </div>
          );
        })}
        {trendyolRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 bg-white/60 px-3 py-3 text-xs text-stone-500">
            Seçilen filtre için ürün bulunamadı.
          </p>
        ) : null}
      </div>
    </section>
  );
}
