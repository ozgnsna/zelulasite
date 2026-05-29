import { TrendyolCategoryAttributesPicker } from "@/components/admin/TrendyolCategoryAttributesPicker";
import { TrendyolCategorySearchPanel } from "@/components/admin/TrendyolCategorySearchPanel";
import { ProductImageManager } from "@/components/admin/products/ProductImageManager";
import { ProductImageUploadOverlay } from "@/components/admin/products/ProductImageUploadOverlay";
import {
  CopyPriceToTrendyolSaleButton,
  CopySkuToTrendyolStockButton,
  SkuFromCategoryButton,
  SlugFromNameButton,
} from "@/components/admin/products/ProductFormSmartActions";
import { ProductFormSaveButton } from "@/components/admin/products/ProductFormSaveButton";
import { TrendyolStatusBadge, TrendyolWarningsPanel } from "@/components/admin/products/ProductFormChannelWarnings";
import { ProductFormDraftStatus } from "@/components/admin/products/ProductFormDraftStatus";
import { ProductFormTrendyolDetailsShell } from "@/components/admin/products/ProductFormTrendyolDetailsShell";
import { TrendyolChannelActiveControl } from "@/components/admin/products/TrendyolChannelActiveControl";
import { ProductFormUnsavedGuard } from "@/components/admin/products/ProductFormUnsavedGuard";
import type { ProductFormProps } from "@/components/admin/products/ProductFormTypes";
import { adminCheckbox, adminField, adminJsonField, adminLabel } from "@/components/admin/products/adminFieldClasses";
import { countTrendyolHttpsProductImages } from "@/lib/marketplaces/trendyol/int-ids";
import { ZELULA_TRENDYOL_BRAND_ID, ZELULA_TRENDYOL_VAT_RATE } from "@/lib/marketplaces/trendyol/shop-defaults";
import { cn } from "@/lib/utils";

/** Sunucudan gelen id bazen string dışında tipte gelebilir; medya yükleme için tek forma indirger. */
function resolveProductId(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  return s.length > 0 ? s : undefined;
}

function trendyolMissingLabels(missingFields: string[]): string {
  const labels = new Set<string>();
  for (const key of missingFields) {
    if (key.startsWith("trendyol_zorunlu_özellik:")) {
      labels.add("Zorunlu özellikler");
      continue;
    }
    if (key === "barcode") labels.add("Barkod");
    if (key === "stock_code") labels.add("Stok kodu");
    if (key === "brand") labels.add("Trendyol marka ID");
    if (key === "category_id") labels.add("Trendyol kategori ID");
    if (key === "product_images") labels.add("https ürün görseli");
    if (key === "sale_price") labels.add("Satış fiyatı");
    if (key === "quantity") labels.add("Adet");
    if (key === "vat_rate") labels.add("KDV");
  }
  return [...labels].join(", ");
}

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-stone-200/50 bg-white/95 p-4 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)] sm:p-6"
    >
      <div className="mb-5 border-b border-stone-100/80 pb-4">
        <h2 className="text-[13px] font-semibold tracking-tight text-stone-900">{title}</h2>
        {description ? <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function OptionalDetails({
  summary,
  hint,
  defaultOpen = false,
  children,
}: {
  summary: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border border-stone-200/50 bg-stone-50/30 [&_summary::-webkit-details-marker]:hidden"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-3 py-3 text-left transition hover:bg-stone-50/80 sm:min-h-0 sm:py-2.5">
        <span className="flex w-full items-center justify-between gap-2">
          <span>
            <span className="text-[12px] font-medium text-stone-700">{summary}</span>
            {hint ? <span className="mt-0.5 block text-[10px] text-stone-500">{hint}</span> : null}
          </span>
          <span className="shrink-0 text-[10px] text-stone-400 group-open:rotate-180 motion-safe:transition" aria-hidden>
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-stone-100/90 px-3 py-3">{children}</div>
    </details>
  );
}

export function ProductForm({
  mode,
  initialProduct,
  productUpdatedAt,
  importedNeedsReview,
  categories,
  collections,
  trendyolReadiness,
  trendyolCategoryAttributePickerRows = [],
  openTrendyolByDefault = false,
  returnTo,
  uploadProductImageAction,
  deleteProductImageAction,
  setProductCoverImageAction,
  pushTrendyolProductAndInventoryAction,
  saveProductAction,
}: ProductFormProps) {
  const p = initialProduct ?? {};
  const attrs = p.trendyol_category_attributes;
  const attrsJson = JSON.stringify(Array.isArray(attrs) ? attrs : [], null, 2);
  const stockQuantity = Number(p.stock_quantity ?? 0);
  const isStockCritical = stockQuantity <= 3;
  const isCategoryMissing = !String(p.category_id ?? "").trim();

  const imageUploadFormId = "zelula-product-image-upload";
  const trendyolPushFormId = "zelula-trendyol-marketplace-push";
  const productImages = Array.isArray(p.product_images) ? p.product_images : [];
  const trendyolHttpsImageCount = countTrendyolHttpsProductImages(productImages);
  const resolvedProductId = resolveProductId(p.id);

  return (
    <>
      <ProductFormUnsavedGuard formId="urun-formu" />
      {resolvedProductId && uploadProductImageAction ? (
        <form
          id={imageUploadFormId}
          action={uploadProductImageAction}
          encType="multipart/form-data"
          className="sr-only"
          aria-hidden="true"
        >
          <ProductImageUploadOverlay />
        </form>
      ) : null}
      {resolvedProductId && pushTrendyolProductAndInventoryAction ? (
        <form id={trendyolPushFormId} action={pushTrendyolProductAndInventoryAction} className="sr-only" aria-hidden="true">
          <input type="hidden" name="product_id" value={resolvedProductId} />
          <input type="hidden" name="trendyol_brand" defaultValue={ZELULA_TRENDYOL_BRAND_ID} />
          <input type="hidden" name="trendyol_category_id" defaultValue="" />
          <input type="hidden" name="trendyol_barcode" defaultValue="" />
          <input type="hidden" name="trendyol_stock_code" defaultValue="" />
          <textarea name="trendyol_category_attributes" rows={1} defaultValue="" tabIndex={-1} className="sr-only" aria-hidden />
          <input type="hidden" name="trendyol_vat_rate" defaultValue={String(ZELULA_TRENDYOL_VAT_RATE)} />
          <input type="hidden" name="trendyol_list_price" defaultValue="" />
          <input type="hidden" name="trendyol_sale_price" defaultValue="" />
          <input type="hidden" name="trendyol_quantity" defaultValue="" />
          <input type="hidden" name="trendyol_dimensional_weight" defaultValue="" />
        </form>
      ) : null}
      {resolvedProductId && deleteProductImageAction
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
                <input type="hidden" name="product_id" value={resolvedProductId} />
                <input type="hidden" name="return_to" value={returnTo} />
              </form>
            ))
        : null}
      {resolvedProductId && setProductCoverImageAction
        ? productImages
            .filter((img) => img && typeof img.id === "string" && img.id.length > 0)
            .map((img) => (
              <form
                key={`cover-img-${img.id}`}
                id={`zelula-cover-image-${img.id}`}
                action={setProductCoverImageAction}
                className="sr-only"
                aria-hidden
              >
                <input type="hidden" name="image_id" value={img.id} />
                <input type="hidden" name="product_id" value={resolvedProductId} />
                <input type="hidden" name="return_to" value={returnTo} />
              </form>
            ))
        : null}
      <form
        id="urun-formu"
        action={saveProductAction}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(248px,280px)] lg:items-start lg:gap-7"
      >
        {mode === "edit" && resolvedProductId ? <input type="hidden" name="id" value={resolvedProductId} /> : null}
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" id="trendyol-https-image-count" value={String(trendyolHttpsImageCount)} readOnly tabIndex={-1} />

        <div className="min-w-0 space-y-6 sm:space-y-7 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {isCategoryMissing ? (
                <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  Kategori seçilmedi
                </span>
              ) : null}
              {isStockCritical ? (
                <span className="rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[10px] font-medium text-amber-900/90">
                  Düşük stok
                </span>
              ) : null}
            </div>
            <ProductFormDraftStatus formId="urun-formu" serverUpdatedAt={productUpdatedAt ?? null} />
          </div>

          {importedNeedsReview ? (
            <details className="rounded-lg border border-stone-200/80 bg-stone-50/50 px-3 py-2 text-sm text-stone-700 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer text-xs font-medium text-stone-600">İçe aktarma kontrol listesi</summary>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
                Trendyol’dan aktarıldı — vitrin metni, görseller ve kategori gözden geçirilmeli.
              </p>
              <div className="mt-2 grid gap-1 text-[11px] text-stone-600 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Başlık
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Açıklama
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Görseller
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Kategori
                </label>
                <label className="inline-flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" className={adminCheckbox} />
                  Fiyat
                </label>
              </div>
            </details>
          ) : null}

          <FormSection id="product-section-basic" title="Temel Bilgiler" description="İsim ve stok kodu — hızlı başlangıç.">
            <div className="space-y-4">
              <div>
                <label className={adminLabel} htmlFor="product-name">
                  Ürün adı <span className="text-rose-600">*</span>
                </label>
                <input
                  id="product-name"
                  name="name"
                  defaultValue={p.name ?? ""}
                  required
                  className={cn(adminField, "border-stone-200/90 bg-white py-2.5 text-[15px] font-medium tracking-tight")}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className={cn(adminLabel, "mb-0")} htmlFor="product-sku">
                    SKU <span className="text-rose-600">*</span>
                  </label>
                  <SkuFromCategoryButton />
                </div>
                <input id="product-sku" name="sku" defaultValue={p.sku ?? ""} required className={cn(adminField, "py-2")} />
              </div>
              <OptionalDetails summary="SEO: slug ve yardımcılar" hint="Zorunlu; genelde otomatik doldurulur.">
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className={cn(adminLabel, "mb-0")} htmlFor="product-slug">
                        Slug <span className="text-rose-600">*</span>
                      </label>
                      <SlugFromNameButton />
                    </div>
                    <input
                      id="product-slug"
                      name="slug"
                      defaultValue={p.slug ?? ""}
                      required
                      className={cn(adminField, "border-stone-200/80 bg-white py-2 text-sm text-stone-800")}
                    />
                  </div>
                </div>
              </OptionalDetails>
            </div>
          </FormSection>

          <OptionalDetails defaultOpen summary="Ürün açıklamaları" hint="Kısa ve uzun metin — liste ve ürün sayfası (zorunlu alanlar).">
            <div className="space-y-3">
              <div>
                <label className={adminLabel} htmlFor="product-short-desc">
                  Kısa <span className="text-rose-600">*</span>
                </label>
                <input id="product-short-desc" name="short_description" defaultValue={p.short_description ?? ""} required className={cn(adminField, "py-2")} />
              </div>
              <div>
                <label className={adminLabel} htmlFor="product-full-desc">
                  Uzun açıklama <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="product-full-desc"
                  name="full_description"
                  defaultValue={p.full_description ?? ""}
                  rows={4}
                  required
                  className={cn(adminField, "min-h-[100px] resize-y py-2 text-sm leading-relaxed")}
                />
              </div>
            </div>
          </OptionalDetails>

          <ProductImageManager
            title="Görseller"
            images={productImages}
            productId={resolvedProductId}
            returnTo={returnTo}
            uploadFormId={resolvedProductId && uploadProductImageAction ? imageUploadFormId : undefined}
            uploadProductImageAction={uploadProductImageAction}
            deleteProductImageAction={deleteProductImageAction}
            setProductCoverImageAction={setProductCoverImageAction}
          />

          <FormSection id="product-section-catalog" title="Kategori" description="Site kataloğundaki yerleşim.">
            <div>
              <label className={adminLabel} htmlFor="product-category">
                Kategori <span className="text-rose-600">*</span>
              </label>
              <select
                id="product-category"
                name="category_id"
                defaultValue={p.category_id ?? ""}
                required
                className={cn(adminField, "py-2")}
              >
                <option value="" disabled>
                  Kategori seçin
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {isCategoryMissing ? (
              <p className="mt-3 text-[10px] leading-relaxed text-rose-700">
                Kategori zorunludur. Kaydetmeden önce doğru kategoriyi seçin.
              </p>
            ) : null}
            <div className="mt-4">
              <OptionalDetails summary="İsteğe bağlı vitrin alanları" hint="Koleksiyon, rozetler, renk ve materyal.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={adminLabel} htmlFor="product-collection">
                      Koleksiyon
                    </label>
                    <select id="product-collection" name="collection_id" defaultValue={p.collection_id ?? ""} className={cn(adminField, "py-2")}>
                      <option value="">—</option>
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
                    <input id="product-color" name="color" defaultValue={p.color ?? ""} className={cn(adminField, "py-2")} />
                  </div>
                  <div>
                    <label className={adminLabel} htmlFor="product-material">
                      Materyal
                    </label>
                    <input id="product-material" name="material" defaultValue={p.material ?? ""} className={cn(adminField, "py-2")} />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <input id="product-featured" type="checkbox" name="featured" defaultChecked={Boolean(p.featured)} className="peer/feat sr-only" />
                    <label
                      htmlFor="product-featured"
                      className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 peer-checked/feat:border-stone-800 peer-checked/feat:bg-stone-900 peer-checked/feat:text-white"
                    >
                      Öne çıkan
                    </label>
                    <input
                      id="product-new-arrival"
                      type="checkbox"
                      name="new_arrival"
                      defaultChecked={mode === "create" ? true : Boolean(p.new_arrival)}
                      className="peer/newa sr-only"
                    />
                    <label
                      htmlFor="product-new-arrival"
                      className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-stone-50 peer-checked/newa:border-stone-800 peer-checked/newa:bg-stone-900 peer-checked/newa:text-white"
                    >
                      Yeni ürün
                    </label>
                  </div>
                </div>
              </OptionalDetails>
            </div>
          </FormSection>

          <ProductFormTrendyolDetailsShell
            initialOpen={openTrendyolByDefault}
            id="product-section-trendyol"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#e9e1d6]/80 bg-[#fffdfa] shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)] [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-stone-50/70">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold tracking-tight text-stone-800">Trendyol</span>
                <TrendyolStatusBadge formId="urun-formu" />
              </span>
            </summary>
            <div className="space-y-4 border-t border-[#e7ded2]/55 px-4 py-4">
              {/* peer / peer-checked: checkbox bu konteynerde ilk olmalı; ~ ile sonraki kardeşler duruma göre stil alır */}
              <TrendyolChannelActiveControl defaultActive={Boolean(p.trendyol_active)} />

              <div className="peer-checked/trendyol:hidden rounded-lg border border-[#e7ded2]/60 bg-[#fdfcfa] px-3 py-2 text-xs text-stone-600">
                <p>Bu ürün Trendyol kanalında yayınlanmıyor.</p>
                <p className="mt-1 text-[11px] text-stone-500">Trendyol alanlarını görmek için üstteki anahtarı aktif edin.</p>
              </div>
              <div className="hidden space-y-4 peer-checked/trendyol:block">
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
                  <div className="md:col-span-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-[#e7ded2]/55 bg-[#faf9f7]/90 px-3 py-2.5 text-[11px] text-stone-600">
                    <span>
                      <span className="font-medium text-stone-700">Marka ID:</span>{" "}
                      <span className="tabular-nums text-stone-800">{ZELULA_TRENDYOL_BRAND_ID}</span>{" "}
                      <span className="text-stone-500">(Zelula, sabit)</span>
                    </span>
                    <span>
                      <span className="font-medium text-stone-700">KDV:</span>{" "}
                      <span className="tabular-nums text-stone-800">%{ZELULA_TRENDYOL_VAT_RATE}</span>{" "}
                      <span className="text-stone-500">(sabit)</span>
                    </span>
                  </div>
                  <input type="hidden" id="trendyol_brand" name="trendyol_brand" defaultValue={ZELULA_TRENDYOL_BRAND_ID} />
                  <input type="hidden" id="trendyol_vat_rate" name="trendyol_vat_rate" defaultValue={String(ZELULA_TRENDYOL_VAT_RATE)} />
                  <p className="md:col-span-2 text-[11px] text-stone-500/80">
                    Mağaza fiyatları sağdaki <span className="font-medium text-stone-600">Fiyat &amp; Stok</span> panelinde.
                  </p>
                  <div className="md:col-span-2">
                    <OptionalDetails summary="Kargo: desi (isteğe bağlı)" hint="Trendyol kargo hesapları için.">
                      <div>
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
                    </OptionalDetails>
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
                      Özellikler (Trendyol kategorisi)
                    </label>
                    <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
                      Aşağıdaki seçiciler JSON&apos;u sizin yerinize doldurur. İleri düzenleme için «Gelişmiş» bölümünü açın.
                    </p>
                    <div className="mt-2">
                      <TrendyolCategoryAttributesPicker
                        initialRows={trendyolCategoryAttributePickerRows}
                        initialProductAttributes={attrs}
                      />
                    </div>
                    <details className="mt-3 rounded-lg border border-stone-200/80 bg-stone-50/50 px-2 py-1.5">
                      <summary className="cursor-pointer text-[10px] font-medium text-stone-600">Gelişmiş: JSON düzenle</summary>
                      <p className="mt-2 text-[9px] leading-relaxed text-stone-500">
                        Ürün açıklaması değil; <code className="rounded bg-white px-0.5">attributeId</code> +{" "}
                        <code className="rounded bg-white px-0.5">attributeValueId</code> veya{" "}
                        <code className="rounded bg-white px-0.5">customAttributeValue</code> dizisi. Seçicilerle çakışırsanız
                        kaydetmeden önce tutarlılığı kontrol edin.
                      </p>
                      <textarea
                        id="trendyol_category_attributes"
                        name="trendyol_category_attributes"
                        rows={5}
                        spellCheck={false}
                        defaultValue={attrsJson}
                        className={`${adminJsonField} mt-2 min-h-[120px] w-full resize-y`}
                      />
                    </details>
                  </div>
                </div>

                <div className="sticky bottom-0 rounded-xl border border-[#e7ded2]/60 bg-white/95 p-3 shadow-[0_-8px_16px_rgba(28,25,23,0.08)]">
                  <TrendyolWarningsPanel
                    formId="urun-formu"
                    trendyolPushFormId={resolvedProductId && pushTrendyolProductAndInventoryAction ? trendyolPushFormId : undefined}
                  />
                </div>
              </div>
              <input type="hidden" id="trendyol_quantity" name="trendyol_quantity" defaultValue={p.trendyol_quantity ?? ""} />
            </div>
          </ProductFormTrendyolDetailsShell>

        </div>

        <aside
          id="product-sidebar-pricing"
          className="lg:sticky lg:top-4 lg:z-20 lg:max-h-[calc(100dvh-1.25rem)] lg:overflow-y-auto lg:self-start"
        >
          <section
            id="product-section-status"
            className="space-y-2.5 rounded-2xl border border-stone-200/60 bg-white/95 p-3 shadow-[0_4px_20px_-8px_rgba(28,25,23,0.08)] ring-1 ring-stone-900/[0.02] sm:p-3.5"
          >
            <div className="border-b border-stone-100/90 pb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">Fiyat &amp; Stok</h2>
              <p className="mt-0.5 text-[9px] leading-snug text-stone-400">Satış fiyatı ve stok — kaydet.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              <div className="rounded-xl border border-stone-200/70 bg-gradient-to-b from-stone-50/90 to-white p-2.5 sm:col-span-2">
                <label className={cn(adminLabel, "mb-1 text-[9px] text-stone-500")} htmlFor="product-price">
                  Satış fiyatı (₺) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="product-price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={p.price ?? 0}
                  required
                  className={cn(
                    adminField,
                    "border-stone-300/80 bg-white py-2.5 text-xl font-bold tabular-nums tracking-tight text-stone-900 shadow-inner shadow-stone-900/[0.03] sm:text-2xl",
                  )}
                  inputMode="decimal"
                />
              </div>

              <div className="rounded-xl border border-stone-200/70 bg-gradient-to-b from-stone-50/90 to-white p-2.5 sm:col-span-2">
                <label className={cn(adminLabel, "mb-1 text-[9px] text-stone-500")} htmlFor="product-stock">
                  Stok <span className="text-rose-600">*</span>
                </label>
                <input
                  id="product-stock"
                  name="stock_quantity"
                  type="number"
                  defaultValue={p.stock_quantity ?? 0}
                  required
                  className={cn(
                    adminField,
                    "border-stone-300/80 bg-white py-2.5 text-xl font-bold tabular-nums tracking-tight text-stone-900 shadow-inner shadow-stone-900/[0.03] sm:text-2xl",
                  )}
                  inputMode="numeric"
                />
                {isStockCritical ? (
                  <p className="mt-1.5 text-[10px] font-medium text-amber-800/90">Stok azaldı.</p>
                ) : null}
              </div>
            </div>

            <OptionalDetails summary="Liste ve Trendyol fiyatları" hint="İsteğe bağlı.">
              <div className="space-y-3">
                <div>
                  <label className={cn(adminLabel, "mb-1 text-[10px] text-stone-500")} htmlFor="product-compare">
                    İndirimli gösterim (liste)
                  </label>
                  <input
                    id="product-compare"
                    name="compare_at_price"
                    type="number"
                    step="0.01"
                    defaultValue={p.compare_at_price ?? ""}
                    placeholder="—"
                    className={cn(adminField, "border-stone-200 bg-white py-2 text-sm tabular-nums")}
                  />
                </div>
                <div id="product-section-trendyol-prices" className="scroll-mt-24 rounded-xl border border-[#e8dfd3]/80 bg-[#faf6f0]/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600/90">Trendyol</p>
                  <p className="mt-1 text-[10px] leading-snug text-stone-500/90">Senkron ve gönderim bu fiyatlarla yapılır.</p>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className={cn(adminLabel, "text-[11px] text-stone-600")} htmlFor="trendyol_sale_price">
                        Trendyol satış
                      </label>
                      <div className="space-y-1">
                        <CopyPriceToTrendyolSaleButton />
                        <input
                          id="trendyol_sale_price"
                          name="trendyol_sale_price"
                          type="number"
                          step="0.01"
                          defaultValue={p.trendyol_sale_price ?? ""}
                          className={cn(adminField, "border-[#ded4c7] bg-white py-2 text-sm font-medium")}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={cn(adminLabel, "text-[11px] text-stone-600")} htmlFor="trendyol_list_price">
                        Trendyol liste
                      </label>
                      <input
                        id="trendyol_list_price"
                        name="trendyol_list_price"
                        type="number"
                        step="0.01"
                        defaultValue={p.trendyol_list_price ?? ""}
                        className={cn(adminField, "border-[#ded4c7] bg-white py-2 text-sm font-medium")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </OptionalDetails>

            <div className="border-t border-stone-100/90 pt-2">
              <label className="relative flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-stone-50/60 px-3 py-2.5">
                <input
                  id="product-is-active"
                  type="checkbox"
                  name="is_active"
                  defaultChecked={p.is_active == null ? true : Boolean(p.is_active)}
                  className="peer/pub sr-only"
                />
                <span className="text-[11px] font-medium text-stone-700">Yayın durumu</span>
                <span className="relative h-5 w-9 shrink-0 rounded-full bg-stone-300 transition peer-checked/pub:bg-emerald-500">
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked/pub:translate-x-4" />
                </span>
              </label>
              <p className="mt-1.5 text-[9px] text-stone-400">Açık: vitrinde görünür.</p>
            </div>

            <div className="border-t border-stone-100/90 pt-2">
              <ProductFormSaveButton className="min-h-[48px] w-full rounded-xl bg-stone-900 py-3 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(28,25,23,0.18)] ring-1 ring-stone-900/10 transition hover:bg-stone-800" />
            </div>
          </section>
        </aside>
      </form>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/90 bg-white/95 px-3 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-12px_28px_rgba(28,25,23,0.12)] backdrop-blur-sm lg:hidden">
        <button
          type="submit"
          form="urun-formu"
          className="pointer-events-auto flex min-h-[48px] w-full items-center justify-center rounded-xl bg-stone-900 px-5 py-3 text-[15px] font-semibold text-[#fdfcfa] shadow-[0_8px_22px_rgba(30,24,18,0.22)] active:scale-[0.99] motion-safe:transition-transform"
        >
          Kaydet
        </button>
      </div>
    </>
  );
}
