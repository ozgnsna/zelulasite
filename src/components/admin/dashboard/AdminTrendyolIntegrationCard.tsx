import type { ReactNode } from "react";

type IntegrationData = {
  environment?: string | null;
  is_active?: boolean | null;
  seller_id?: string | null;
  supplier_id?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
} | null;

export function AdminTrendyolIntegrationCard({
  integration,
  saveTrendyolIntegrationSettings,
  syncTrendyolPriceInventoryBatch,
  fetchTrendyolOrdersAction,
  importTrendyolApprovedProductsAction,
  checkTrendyolBatchStatusAction,
  logs,
}: {
  integration: IntegrationData;
  saveTrendyolIntegrationSettings: (formData: FormData) => Promise<void>;
  syncTrendyolPriceInventoryBatch: (formData: FormData) => Promise<void>;
  fetchTrendyolOrdersAction: (formData: FormData) => Promise<void>;
  importTrendyolApprovedProductsAction: (formData: FormData) => Promise<void>;
  checkTrendyolBatchStatusAction: (formData: FormData) => Promise<void>;
  logs: ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-[#e8dfd3] bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f5_100%)] p-5 shadow-[0_8px_24px_rgba(62,52,38,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide text-stone-800">Trendyol Entegrasyonu</h2>
          <p className="mt-1 text-xs font-light text-stone-500">
            Zelula admin ana kaynak; ürün/fiyat/stok/sipariş senkronu server-side çalışır.
          </p>
        </div>
        <p className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] text-stone-600">
          Ortam: {integration?.environment ?? "stage"} · {integration?.is_active ? "Aktif" : "Pasif"}
        </p>
      </div>

      <form
        action={saveTrendyolIntegrationSettings}
        className="mt-4 grid gap-2 rounded-xl border border-stone-200/80 bg-white/80 p-3 sm:grid-cols-2"
      >
        <select name="environment" defaultValue={integration?.environment ?? "stage"} className="rounded border p-2 text-sm">
          <option value="stage">stage</option>
          <option value="prod">prod</option>
        </select>
        <input name="seller_id" defaultValue={integration?.seller_id ?? ""} placeholder="seller_id" className="rounded border p-2 text-sm" />
        <input name="supplier_id" defaultValue={integration?.supplier_id ?? ""} placeholder="supplier_id (opsiyonel)" className="rounded border p-2 text-sm" />
        <input name="api_key" defaultValue={integration?.api_key ?? ""} placeholder="api_key" className="rounded border p-2 text-sm" />
        <input name="api_secret" defaultValue={integration?.api_secret ?? ""} placeholder="api_secret" className="rounded border p-2 text-sm" />
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="is_active" defaultChecked={Boolean(integration?.is_active)} />
          Entegrasyon aktif
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">Trendyol ayarlarını kaydet</button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={syncTrendyolPriceInventoryBatch}>
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700">
            Aktif ürünler için fiyat/stok batch sync
          </button>
        </form>
        <form action={fetchTrendyolOrdersAction}>
          <button
            type="submit"
            title="Son günlerdeki Trendyol siparişlerini çeker; eşleşen satırlar için Zelula stokundan düşer."
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700"
          >
            Trendyol siparişlerini çek
          </button>
        </form>
        <form
          action={importTrendyolApprovedProductsAction}
          className="flex max-w-md flex-col gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
        >
          <p className="text-[11px] leading-relaxed text-stone-600">
            Onaylı ürünlerden satışta ve stokta olanlar Zelula&apos;ya yazılır (yeni kayıtlar pasif). Aynı barkod
            güncellenir; silinen ürünler Trendyol bağlantısından çıkarılır.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="import_mode"
              value="preview"
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-[11px] text-stone-800 hover:bg-stone-50"
            >
              Önizle
            </button>
            <button
              type="submit"
              name="import_mode"
              value="import"
              className="rounded-md bg-stone-900 px-2.5 py-1 text-[11px] text-white"
            >
              İçe aktar
            </button>
          </div>
        </form>
        <form action={checkTrendyolBatchStatusAction} className="flex items-center gap-2">
          <input name="batch_request_id" placeholder="batchRequestId" className="rounded border p-1.5 text-xs" />
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700">
            Batch durumunu kontrol et
          </button>
        </form>
      </div>

      {logs}
    </section>
  );
}
