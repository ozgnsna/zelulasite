import type { ReactNode } from "react";
import { AdminTrendyolSubmitButton } from "@/components/admin/dashboard/AdminTrendyolSubmitButton";
import {
  adminField,
  adminLabel,
  adminSectionCard,
  adminSectionSubtitle,
  adminSectionTitle,
} from "@/components/admin/products/adminFieldClasses";

type IntegrationData = {
  environment?: string | null;
  is_active?: boolean | null;
  seller_id?: string | null;
  supplier_id?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
} | null;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={adminLabel}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-stone-400">{hint}</span> : null}
    </label>
  );
}

function ActionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-[#e7ded2]/70 bg-[#faf8f5]/50 p-4">
      <h3 className="text-sm font-medium text-stone-800">{title}</h3>
      <p className="mt-1 flex-1 text-[11px] leading-relaxed text-stone-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

export function AdminTrendyolIntegrationCard({
  integration,
  saveTrendyolIntegrationSettings,
  syncTrendyolPriceInventoryBatch,
  fetchTrendyolOrdersAction,
  importTrendyolApprovedProductsAction,
  checkTrendyolBatchStatusAction,
  reconcileDailyTrendyolStockAction,
  logs,
}: {
  integration: IntegrationData;
  saveTrendyolIntegrationSettings: (formData: FormData) => Promise<void>;
  syncTrendyolPriceInventoryBatch: (formData: FormData) => Promise<void>;
  fetchTrendyolOrdersAction: (formData: FormData) => Promise<void>;
  importTrendyolApprovedProductsAction: (formData: FormData) => Promise<void>;
  checkTrendyolBatchStatusAction: (formData: FormData) => Promise<void>;
  reconcileDailyTrendyolStockAction: () => Promise<void>;
  logs: ReactNode;
}) {
  const env = integration?.environment ?? "stage";
  const active = Boolean(integration?.is_active);

  return (
    <>
      <section id="trendyol-ayarlar" className={`${adminSectionCard} mb-6 scroll-mt-24`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>API bağlantısı</h2>
            <p className={adminSectionSubtitle}>
              Trendyol satıcı panelindeki entegrasyon bilgileri. Zelula ana kaynak; değişiklikler buradan kaydedilir.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
              active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-50 text-stone-600"
            }`}
          >
            {active ? "Aktif" : "Pasif"} · {env}
          </span>
        </div>

        <form action={saveTrendyolIntegrationSettings} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Ortam" hint="Canlı mağaza için prod seçin.">
            <select name="environment" defaultValue={env} className={adminField}>
              <option value="stage">Test (stage)</option>
              <option value="prod">Canlı (prod)</option>
            </select>
          </Field>
          <Field label="Satıcı ID (seller_id)" hint="Trendyol satıcı numaranız.">
            <input name="seller_id" defaultValue={integration?.seller_id ?? ""} className={adminField} autoComplete="off" />
          </Field>
          <Field label="Tedarikçi ID (opsiyonel)" hint="Çoklu tedarikçi hesabında gerekebilir.">
            <input name="supplier_id" defaultValue={integration?.supplier_id ?? ""} className={adminField} autoComplete="off" />
          </Field>
          <div className="hidden sm:block" aria-hidden />
          <Field label="API anahtarı">
            <input name="api_key" defaultValue={integration?.api_key ?? ""} className={adminField} autoComplete="off" />
          </Field>
          <Field label="API gizli anahtarı">
            <input
              name="api_secret"
              type="password"
              defaultValue={integration?.api_secret ?? ""}
              className={adminField}
              autoComplete="new-password"
            />
          </Field>
          <label className="flex items-center gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={active}
              className="h-4 w-4 rounded border-stone-300 text-stone-900"
            />
            <span className="text-sm text-stone-700">Entegrasyonu etkinleştir</span>
          </label>
          <div className="sm:col-span-2">
            <AdminTrendyolSubmitButton variant="primary" pendingLabel="Kaydediliyor…">
              Bağlantıyı kaydet
            </AdminTrendyolSubmitButton>
          </div>
        </form>
      </section>

      <section id="trendyol-islemler" className={`${adminSectionCard} mb-6 scroll-mt-24`}>
        <h2 className={adminSectionTitle}>Senkron işlemleri</h2>
        <p className={adminSectionSubtitle}>Her işlem tamamlandığında üstte sonuç kutusu ve altta log görünür.</p>

        <article className="mt-5 rounded-xl border border-[#c6a15b]/40 bg-[#faf6ef] p-4">
          <h3 className="text-sm font-semibold text-stone-900">Günlük stok eşitleme</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
            Günde bir kez otomatik çalışır: son 24 saat Trendyol siparişlerini işler, site stoğunu Trendyol stoğuyla
            birebir eşitler (Trendyol kaynak — azalır da artar da) ve Trendyol&apos;a güncel stok gönderir. Bu buton ile
            beklemeden de elle eşitleyebilirsin.
          </p>
          <form action={reconcileDailyTrendyolStockAction} className="mt-3">
            <AdminTrendyolSubmitButton variant="primary" pendingLabel="Eşitleniyor…">
              Bugünkü stokları eşitle
            </AdminTrendyolSubmitButton>
          </form>
        </article>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionCard
            title="Ürün içe aktarma"
            description="Onaylı, satışta ve stoklu ürünler Zelula'ya yazılır. Yeni kayıtlar pasif gelir; aynı barkod güncellenir."
          >
            <form action={importTrendyolApprovedProductsAction} className="flex flex-wrap gap-2">
              <AdminTrendyolSubmitButton
                name="import_mode"
                value="preview"
                pendingLabel="Önizleniyor…"
                variant="secondary"
              >
                Önizle
              </AdminTrendyolSubmitButton>
              <AdminTrendyolSubmitButton
                name="import_mode"
                value="import"
                pendingLabel="Aktarılıyor…"
                variant="primary"
              >
                İçe aktar
              </AdminTrendyolSubmitButton>
            </form>
          </ActionCard>

          <ActionCard
            title="Fiyat ve stok"
            description="Sitede aktif ve Trendyol'a bağlı ürünlerin fiyat/stok bilgisini toplu gönderir."
          >
            <form action={syncTrendyolPriceInventoryBatch}>
              <AdminTrendyolSubmitButton pendingLabel="Gönderiliyor…" variant="secondary">
                Batch sync başlat
              </AdminTrendyolSubmitButton>
            </form>
          </ActionCard>

          <ActionCard
            title="Siparişler"
            description="Son günlerdeki Trendyol siparişlerini çeker; eşleşen ürünlerde Zelula stokundan düşer."
          >
            <form action={fetchTrendyolOrdersAction}>
              <AdminTrendyolSubmitButton pendingLabel="Çekiliyor…" variant="secondary">
                Siparişleri çek
              </AdminTrendyolSubmitButton>
            </form>
          </ActionCard>

          <ActionCard title="Batch durumu" description="Ürün gönderimi sonrası Trendyol'dan dönen batchRequestId ile sonucu sorgulayın.">
            <form action={checkTrendyolBatchStatusAction} className="flex w-full flex-col gap-2 sm:flex-row">
              <input
                name="batch_request_id"
                placeholder="batchRequestId"
                className="min-h-[40px] flex-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs"
              />
              <AdminTrendyolSubmitButton pendingLabel="Sorgulanıyor…" variant="secondary" className="shrink-0">
                Sorgula
              </AdminTrendyolSubmitButton>
            </form>
          </ActionCard>
        </div>
      </section>

      <section id="trendyol-loglar" className={`${adminSectionCard} mb-8 scroll-mt-24`}>
        <h2 className={adminSectionTitle}>Son işlem kayıtları</h2>
        <p className={adminSectionSubtitle}>Trendyol API çağrılarının özeti. Hata satırlarında ürün düzenleme linki çıkar.</p>
        {logs}
      </section>
    </>
  );
}

