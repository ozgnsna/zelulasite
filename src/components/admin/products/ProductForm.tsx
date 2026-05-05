import { TrendyolCategorySearchPanel } from "@/components/admin/TrendyolCategorySearchPanel";
import { ProductImageManager } from "@/components/admin/products/ProductImageManager";
import {
  CopyPriceToTrendyolSaleButton,
  CopySkuToTrendyolStockButton,
  SkuFromCategoryButton,
  SlugFromNameButton,
} from "@/components/admin/products/ProductFormSmartActions";
import { ProductFormSaveButton } from "@/components/admin/products/ProductFormSaveButton";
import { StockWarningInline, TrendyolStatusBadge, TrendyolWarningsPanel } from "@/components/admin/products/ProductFormChannelWarnings";
import { ProductFormUnsavedGuard } from "@/components/admin/products/ProductFormUnsavedGuard";
import type { ProductFormProps } from "@/components/admin/products/ProductFormTypes";
import {
  adminCheckbox,
  adminField,
  adminJsonField,
  adminLabel,
  adminSectionCard,
} from "@/components/admin/products/adminFieldClasses";
import { cn } from "@/lib/utils";

function trendyolMissingLabels(missingFields: string[]): string {
  const labels = new Set<string>();
  for (const key of missingFields) {
    if (key.startsWith("trendyol_zorunlu_özellik:")) {
      labels.add("Zorunlu özellikler");
      continue;
    }
    if (key === "barcode") labels.add("Barkod");
    if (key === "stock_code") labels.add("Stok kodu");
    if (key === "brand") labels.add("Marka");
    if (key === "category_id") labels.add("Kategori ID");
    if (key === "sale_price") labels.add("Satış fiyatı");
    if (key === "quantity") labels.add("Adet");
    if (key === "vat_rate") labels.add("KDV");
  }
  return [...labels].join(", ");
}

export function ProductForm({
  mode,
  initialProduct,
  importedNeedsReview,
  categories,
  collections,
  trendyolReadiness,
  returnTo,
  uploadProductImageAction,
  deleteProductImageAction,
  saveProductAction,
}: ProductFormProps) {
  const p = initialProduct ?? {};
  const attrs = p.trendyol_category_attributes;
  const attrsJson = JSON.stringify(Array.isArray(attrs) ? attrs : [], null, 2);
  const stockQuantity = Number(p.stock_quantity ?? 0);
  const isStockCritical = stockQuantity <= 3;
  const isCategoryMissing = !String(p.category_id ?? "").trim();

  const imageUploadFormId = "zelula-product-image-upload";
  const productImages = Array.isArray(p.product_images) ? p.product_images : [];

  return (
    <>
      <ProductFormUnsavedGuard formId="urun-formu" />
      {p.id && uploadProductImageAction ? (
        <form id={imageUploadFormId} action={uploadProductImageAction} className="sr-only" aria-hidden="true" />
      ) : null}
      {p.id && deleteProductImageAction
        ? productImages
            .filter((img) => img && typeof img.id === "string" && img.id.length > 0)
            .map((img) => (
              <form
                key={`del-img-${img.id}`}
                id={`zelula-delete-image-${img.id}`}
                action={deleteProductImageAction}
                className="sr-only"
                aria-hidden
              >
                <input type="hidden" name="image_id" value={img.id} />
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="return_to" value={returnTo} />
              </form>
            ))
        : null}
      <form
        id="urun-formu"
        action={saveProductAction}
        className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] lg:items-start"
      >
        {mode === "edit" && p.id ? <input type="hidden" name="id" value={p.id} /> : null}
        <input type="hidden" name="return_to" value={returnTo} />

        <div className="min-w-0 space-y-6">
          {importedNeedsReview ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                Bu ürün Trendyol’dan içe aktarıldı. Site açıklaması, görseller ve kategori kontrol edilmeli.
              </p>
              <div className="mt-2 grid gap-1 text-xs text-amber-900/90 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Site başlığı kontrol edildi
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Açıklama kontrol edildi
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Görsel kontrol edildi
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Kategori kontrol edildi
                </label>
                <label className="inline-flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Zelula fiyatı kontrol edildi
                </label>
              </div>
            </section>
          ) : null}
          <section className="flex flex-wrap items-center gap-2">
            {isCategoryMissing ? (
              <span className="rounded-full border border-orange-300/80 bg-orange-100/70 px-2.5 py-1 text-[11px] font-semibold text-orange-900">
                Kategori eksik
              </span>
            ) : null}
            {isStockCritical ? (
              <span className="rounded-full border border-rose-300/80 bg-rose-100/70 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                Stok kritik
              </span>
            ) : null}
          </section>

          <section
            id="product-section-basic"
            className={cn(
              adminSectionCard,
              "scroll-mt-24 space-y-4 border-[#e9e1d6]/80 bg-[#fffdfa] shadow-[0_1px_2px_rgba(28,25,23,0.03),0_10px_26px_-16px_rgba(28,25,23,0.08)]",
            )}
          >
            <h2 className="text-base font-semibold tracking-tight text-stone-800">Ürün Kimliği</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={adminLabel} htmlFor="product-name">
                  Ürün adı
                </label>
                <input id="product-name" name="name" defaultValue={p.name ?? ""} required className={adminField} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className={cn(adminLabel, "mb-0")} htmlFor="product-sku">
                    SKU
                  </label>
                  <span className="opacity-80">
                    <SkuFromCategoryButton />
                  </span>
                </div>
                <input id="product-sku" name="sku" defaultValue={p.sku ?? ""} required className={adminField} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className={cn(adminLabel, "mb-0 text-stone-400/90")} htmlFor="product-slug">
                    Slug
                  </label>
                  <span className="opacity-70">
                    <SlugFromNameButton />
                  </span>
                </div>
                <input
                  id="product-slug"
                  name="slug"
                  defaultValue={p.slug ?? ""}
                  required
                  className={cn(adminField, "border-[#ece7de] bg-[#faf8f4] py-2 text-xs text-stone-500")}
                />
                <p className="mt-1 text-[10px] text-stone-400">Slug otomatik oluşturulur veya SEO için düzenlenebilir.</p>
              </div>
            </div>
          </section>

          <section className={cn(adminSectionCard, "space-y-4 border-[#e9e1d6]/80 bg-[#fffdfa]")}>
            <h2 className="text-base font-semibold tracking-tight text-stone-800">Açıklamalar</h2>
            <div>
              <label className={adminLabel} htmlFor="product-short-desc">
                Kısa açıklama
              </label>
              <input id="product-short-desc" name="short_description" defaultValue={p.short_description ?? ""} required className={adminField} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="product-full-desc">
                Açıklama
              </label>
              <textarea
                id="product-full-desc"
                name="full_description"
                defaultValue={p.full_description ?? ""}
                rows={4}
                required
                className={`${adminField} min-h-[108px] resize-y`}
              />
              <p className="mt-1.5 text-xs text-stone-500">Ürün sayfasında görünen ana açıklamadır.</p>
            </div>
          </section>

          <div id="product-section-images" className="scroll-mt-24">
            <ProductImageManager
              images={productImages}
              productId={typeof p.id === "string" ? p.id : undefined}
              returnTo={returnTo}
              uploadFormId={p.id && uploadProductImageAction ? imageUploadFormId : undefined}
              uploadProductImageAction={uploadProductImageAction}
              deleteProductImageAction={deleteProductImageAction}
            />
          </div>

          <section id="product-section-catalog" className={cn(adminSectionCard, "scroll-mt-24 space-y-4 border-[#e9e1d6]/80 bg-[#fffdfa]")}>
            <h2 className="text-base font-semibold tracking-tight text-stone-800">Kategoriler & Filtreler</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={adminLabel} htmlFor="product-category">
                  Kategori
                </label>
                <select id="product-category" name="category_id" defaultValue={p.category_id ?? ""} className={adminField}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={adminLabel} htmlFor="product-collection">
                  Alt kategori / Koleksiyon
                </label>
                <select id="product-collection" name="collection_id" defaultValue={p.collection_id ?? ""} className={adminField}>
                  <option value="">Koleksiyon yok</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={adminLabel} htmlFor="product-color">
                  Renk
                </label>
                <input id="product-color" name="color" defaultValue={p.color ?? ""} className={adminField} />
              </div>
              <div>
                <label className={adminLabel} htmlFor="product-material">
                  Materyal
                </label>
                <input id="product-material" name="material" defaultValue={p.material ?? ""} className={adminField} />
              </div>
            </div>
            {isCategoryMissing ? (
              <p className="rounded-xl border border-orange-200/85 bg-orange-50/75 px-3 py-2 text-xs font-medium text-orange-900">
                ⚠ Kategori seçilmeden Trendyol yayını tamamlanamaz.
              </p>
            ) : null}
          </section>

          <details
            id="product-section-trendyol"
            open={false}
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#e9e1d6]/80 bg-[#fffdfa] shadow-[0_1px_2px_rgba(28,25,23,0.04)] [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-stone-50/70">
              <span className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold tracking-tight text-stone-800">Trendyol yayını (opsiyonel)</span>
                <TrendyolStatusBadge formId="urun-formu" />
              </span>
            </summary>
            <div className="space-y-4 border-t border-[#e7ded2]/55 px-4 py-4">
              <div className="rounded-xl border border-[#e7ded2]/65 bg-white px-3 py-2.5">
                <input
                  id="trendyol_active"
                  type="checkbox"
                  name="trendyol_active"
                  defaultChecked={Boolean(p.trendyol_active)}
                  className={cn(adminCheckbox, "peer sr-only")}
                />
                <label htmlFor="trendyol_active" className="inline-flex w-full cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-medium text-stone-700">
                    <span className="peer-checked:hidden">Trendyol kanalında pasif</span>
                    <span className="hidden peer-checked:inline">Trendyol kanalında aktif</span>
                  </span>
                  <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-stone-300/80 transition-colors peer-checked:bg-emerald-500/70">
                    <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-stone-500">Kapalıyken ürün Trendyol kanalına gönderilmez.</p>
                  <span className="rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 peer-checked:hidden">
                    Kapalı
                  </span>
                  <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 peer-checked:inline-flex">
                    Aktif
                  </span>
                </div>
              </div>

              <div className="peer-checked:hidden rounded-lg border border-[#e7ded2]/60 bg-[#fdfcfa] px-3 py-2 text-xs text-stone-600">
                <p>Bu ürün Trendyol kanalında yayınlanmıyor.</p>
                <p className="mt-1 text-[11px] text-stone-500">Trendyol alanlarını görmek için üstteki anahtarı aktif edin.</p>
              </div>
              <div className="hidden space-y-4 peer-checked:block">
                {mode === "edit" && trendyolReadiness && trendyolReadiness.status !== "disabled" ? (
                  <div className="text-xs text-stone-600">
                    {trendyolReadiness.status === "ready"
                      ? "Trendyol’a gönderilmeye hazır"
                      : `Eksik alanlar: ${trendyolMissingLabels(trendyolReadiness.missingFields) || "—"}`}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#e7ded2]/60 bg-white p-3 md:grid-cols-2">
                  <p className="md:col-span-2 text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/80">Kimlik</p>
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_barcode">
                      Barkod
                    </label>
                    <input id="trendyol_barcode" name="trendyol_barcode" defaultValue={p.trendyol_barcode ?? ""} className={adminField} />
                  </div>
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_stock_code">
                      Stok kodu
                    </label>
                    <div className="space-y-1">
                      <CopySkuToTrendyolStockButton />
                      <input id="trendyol_stock_code" name="trendyol_stock_code" defaultValue={p.trendyol_stock_code ?? ""} className={adminField} />
                    </div>
                  </div>
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_brand">
                      Marka
                    </label>
                    <input id="trendyol_brand" name="trendyol_brand" defaultValue={p.trendyol_brand ?? ""} className={adminField} />
                  </div>
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_vat_rate">
                      KDV
                    </label>
                    <input id="trendyol_vat_rate" name="trendyol_vat_rate" type="number" defaultValue={p.trendyol_vat_rate ?? 20} className={adminField} />
                  </div>
                  <p className="md:col-span-2 text-[11px] text-stone-500/80">
                    Mağaza fiyatları sağdaki <span className="font-medium text-stone-600">Fiyat &amp; Stok</span> panelinde.
                  </p>
                  <div className="md:col-span-2">
                    <label className={adminLabel} htmlFor="trendyol_dimensional_weight">
                      Desi
                    </label>
                    <input
                      id="trendyol_dimensional_weight"
                      name="trendyol_dimensional_weight"
                      type="number"
                      step="0.01"
                      defaultValue={p.trendyol_dimensional_weight ?? ""}
                      className={adminField}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#e7ded2]/60 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/80">Kategori</p>
                  <TrendyolCategorySearchPanel embedded />
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_category_id">
                      Kategori ID
                    </label>
                    <input id="trendyol_category_id" name="trendyol_category_id" defaultValue={p.trendyol_category_id ?? ""} className={adminField} />
                  </div>
                  <div>
                    <label className={adminLabel} htmlFor="trendyol_category_attributes">
                      Özellikler
                    </label>
                    <textarea
                      id="trendyol_category_attributes"
                      name="trendyol_category_attributes"
                      rows={4}
                      spellCheck={false}
                      defaultValue={attrsJson}
                      className={`${adminJsonField} min-h-[96px] resize-y`}
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 rounded-xl border border-[#e7ded2]/60 bg-white/95 p-3 shadow-[0_-8px_16px_rgba(28,25,23,0.08)]">
                  <TrendyolWarningsPanel formId="urun-formu" />
                </div>
              </div>
              <input type="hidden" id="trendyol_quantity" name="trendyol_quantity" defaultValue={p.trendyol_quantity ?? ""} />
            </div>
          </details>

        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section id="product-section-status" className={cn(adminSectionCard, "space-y-5 border-[#e9e1d6]/80 bg-[#fffdfa] p-5 sm:p-6")}>
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">Fiyat & Stok</h2>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/85">Fiyat inputları</p>
              <p className="text-[11px] text-stone-500/75">Zelula sitede gösterilen fiyat ile Trendyol mağaza fiyatı ayrıdır.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-[#ece4d9]/70 bg-[#fcfaf7]/80 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600/90">Site fiyatı</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className={cn(adminLabel, "font-semibold text-stone-600")} htmlFor="product-price">
                      Zelula satış fiyatı
                    </label>
                    <input
                      id="product-price"
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={p.price ?? 0}
                      required
                      className={cn(adminField, "border-[#ded4c7] bg-white py-3 text-base font-semibold")}
                    />
                    <p className="mt-1 text-[11px] text-stone-500">Müşterinin ödeme adımında göreceği güncel satış fiyatı.</p>
                  </div>
                  <div>
                    <label className={cn(adminLabel, "font-semibold text-stone-600")} htmlFor="product-compare">
                      Etiket fiyatı (eski fiyat)
                    </label>
                    <input
                      id="product-compare"
                      name="compare_at_price"
                      type="number"
                      step="0.01"
                      defaultValue={p.compare_at_price ?? ""}
                      placeholder="Örn: 749"
                      className={cn(adminField, "border-[#ded4c7] bg-white py-3 font-medium")}
                    />
                    <p className="mt-1 text-[11px] text-stone-500">İndirim göstermek için satış fiyatından yüksek girin; kullanmayacaksanız boş bırakın.</p>
                  </div>
                </div>
              </div>

              <div id="product-section-trendyol-prices" className="scroll-mt-24 rounded-xl border border-[#e8dfd3]/90 bg-[#faf6f0]/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600/90">Trendyol fiyatı</p>
                <p className="mt-1 text-[11px] text-stone-500/80">Trendyol’a senkron ve gönderim bu fiyatlarla yapılır; site fiyatından bağımsızdır.</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className={cn(adminLabel, "font-semibold text-stone-600")} htmlFor="trendyol_sale_price">
                      Trendyol satış fiyatı
                    </label>
                    <div className="space-y-1">
                      <CopyPriceToTrendyolSaleButton />
                      <input
                        id="trendyol_sale_price"
                        name="trendyol_sale_price"
                        type="number"
                        step="0.01"
                        defaultValue={p.trendyol_sale_price ?? ""}
                        className={cn(adminField, "border-[#ded4c7] bg-white py-3 font-medium")}
                      />
                      <p className="text-[11px] text-stone-500">Trendyol’a gönderilen satış fiyatı bu alandan alınır.</p>
                    </div>
                  </div>
                  <div>
                    <label className={cn(adminLabel, "font-semibold text-stone-600")} htmlFor="trendyol_list_price">
                      Trendyol liste fiyatı
                    </label>
                    <input
                      id="trendyol_list_price"
                      name="trendyol_list_price"
                      type="number"
                      step="0.01"
                      defaultValue={p.trendyol_list_price ?? ""}
                      className={cn(adminField, "border-[#ded4c7] bg-white py-3 font-medium")}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={cn(adminLabel, "font-semibold text-stone-600")} htmlFor="product-stock">
                  Ortak Stok
                </label>
                <input
                  id="product-stock"
                  name="stock_quantity"
                  type="number"
                  defaultValue={p.stock_quantity ?? 0}
                  required
                  className={cn(adminField, "border-[#dcd1c3] bg-white py-3 text-base font-semibold")}
                />
                <p className="mt-1 text-[11px] text-stone-500">Zelula ve Trendyol satışlarında ortak düşer.</p>
                {isStockCritical ? (
                  <p className="mt-2 rounded-lg border border-rose-200/65 bg-rose-50/70 px-2.5 py-1.5 text-[11px] font-medium text-rose-800">
                    Stok kritik seviyede
                  </p>
                ) : null}
                <StockWarningInline formId="urun-formu" />
              </div>
            </div>
            <div className="rounded-xl border border-[#e7ded2]/85 bg-[#faf8f5] p-3">
              <p className="text-sm font-semibold tracking-tight text-stone-800">Pazarkar ile fiyat hesapla</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600/90">
                Ürün maliyeti, komisyon, kargo ve kampanya senaryolarını Pazarkar üzerinden hesaplayabilirsiniz.
              </p>
              <a
                href="https://pazarkar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#d8cbbb] bg-white px-3.5 py-2 text-[11px] font-medium text-stone-700 shadow-sm transition duration-150 ease-in-out hover:border-[#cdbca7] hover:bg-stone-50 hover:shadow-md"
              >
                <span aria-hidden className="text-xs leading-none">
                  ↗
                </span>
                Pazarkar&apos;da hesapla
              </a>
            </div>
            <div className="border-t border-[#f1ebe2]/75 pt-3" />
            <div className="relative z-20 space-y-2 rounded-xl border border-[#efe8de]/70 bg-[#fcfaf7] px-2.5 py-2">
              <h3 className="text-sm font-semibold tracking-tight text-stone-800">Site yayını</h3>

              <div className="space-y-1.5">
                <label className="relative inline-flex w-full cursor-pointer items-center justify-between gap-3">
                  <input
                    id="product-is-active"
                    type="checkbox"
                    name="is_active"
                    defaultChecked={p.is_active == null ? true : Boolean(p.is_active)}
                    className="peer/publish absolute inset-0 z-10 cursor-pointer opacity-0"
                  />
                  <span className="inline-flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500/85">Site yayın durumu</span>
                    <span className="relative block h-4 text-[12px] font-medium text-stone-600">
                      <span className="block transition-all duration-200 peer-checked/publish:-translate-y-1 peer-checked/publish:opacity-0">Sitede kapalı</span>
                      <span className="absolute inset-0 hidden translate-y-1 opacity-0 transition-all duration-200 peer-checked/publish:block peer-checked/publish:translate-y-0 peer-checked/publish:opacity-100">
                        Sitede yayında
                      </span>
                    </span>
                  </span>
                  <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-stone-300/80 transition-colors duration-200 peer-checked/publish:bg-emerald-500/70">
                    <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform peer-checked/publish:translate-x-5" />
                  </span>
                </label>
                <span className="block text-[11px] text-stone-500/70">
                  <span className="peer-checked/publish:hidden">Müşteri vitrininde görünmez</span>
                  <span className="hidden peer-checked/publish:inline">Müşteri vitrininde görünür</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <input id="product-featured" type="checkbox" name="featured" defaultChecked={Boolean(p.featured)} className="peer/featured sr-only" />
                  <label
                    htmlFor="product-featured"
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#deceba] bg-transparent px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-50 peer-checked/featured:bg-[#f8efe0] peer-checked/featured:text-amber-800"
                  >
                    ⭐ Vitrinde
                  </label>
                </div>
                <div>
                  <input id="product-new-arrival" type="checkbox" name="new_arrival" defaultChecked={Boolean(p.new_arrival)} className="peer/new sr-only" />
                  <label
                    htmlFor="product-new-arrival"
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#deceba] bg-transparent px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-50 peer-checked/new:bg-[#fbf4e8] peer-checked/new:text-amber-800"
                  >
                    ✨ Yeni
                  </label>
                </div>
              </div>
            </div>
            <div className="sticky bottom-3 z-0 space-y-2 rounded-xl border border-[#e9e1d6]/80 bg-white/95 p-3 shadow-[0_8px_24px_rgba(28,25,23,0.1)] backdrop-blur">
              <p className="text-[11px] font-medium text-stone-500/65">Yaptığın değişiklikler kaydedilecek</p>
              <ProductFormSaveButton className="py-3.5 text-base font-semibold transition duration-150 ease-in-out hover:scale-[1.01] hover:shadow-[0_12px_24px_rgba(30,24,18,0.24)]" />
            </div>
          </section>
        </aside>
      </form>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-[#e7ded2]/90 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_rgba(28,25,23,0.1)] backdrop-blur-sm lg:hidden">
        <button type="submit" form="urun-formu" className="pointer-events-auto w-full rounded-xl bg-stone-800 px-6 py-3 text-base font-medium text-[#fdfcfa] shadow-[0_8px_20px_rgba(30,24,18,0.18)]">
          💾 Değişiklikleri kaydet
        </button>
      </div>
    </>
  );
}
