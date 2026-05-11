import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteProductImage,
  pushTrendyolProductAndInventoryFromForm,
  saveProduct,
  uploadProductImage,
} from "@/app/actions/admin";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRENDYOL_IMPORTED_REVIEW_NOTE } from "@/lib/marketplaces/trendyol/products";
import { createClient } from "@/lib/supabase/server";
import {
  buildCategoryReadinessFromCache,
  extractCategoryAttributeDefinitions,
  extractCategoryAttributesForPicker,
} from "@/lib/marketplaces/trendyol/categories";
import { countTrendyolHttpsProductImages } from "@/lib/marketplaces/trendyol/int-ids";
import { evaluateTrendyolReadiness } from "@/lib/marketplaces/trendyol/readiness";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    productJsonError?: string;
    imageUploadError?: string;
    imageUploadOk?: string;
    imageDeleted?: string;
    productSaved?: string;
    trendyolPushOk?: string;
    trendyolPushError?: string;
    trendyolPushInfo?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const productJsonError = sp.productJsonError ?? "";
  const imageUploadError = sp.imageUploadError ?? "";
  const imageUploadOk = sp.imageUploadOk === "1";
  const imageDeleted = sp.imageDeleted === "1";
  const productSaved = sp.productSaved === "1";
  const trendyolPushOk = sp.trendyolPushOk === "1";
  const trendyolPushError = sp.trendyolPushError ?? "";
  const trendyolPushInfo = sp.trendyolPushInfo ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const [{ data: product }, { data: categories }, { data: collections }, { data: integration }] = await Promise.all([
    admin.from("products").select("*,product_images(*)").eq("id", id).maybeSingle(),
    admin.from("categories").select("*").order("name"),
    admin.from("collections").select("*").order("name"),
    admin.from("marketplace_integrations").select("id").eq("marketplace", "trendyol").maybeSingle(),
  ]);
  if (!product) redirect("/admin/products");

  const categoryId = String((product as Record<string, unknown>).trendyol_category_id ?? "").trim();
  let cacheRow: { category_id: string; payload: unknown; fetched_at: string } | null = null;
  if (integration?.id && categoryId) {
    const { data } = await admin
      .from("marketplace_category_attribute_cache")
      .select("category_id,payload,fetched_at")
      .eq("integration_id", integration.id)
      .eq("category_id", categoryId)
      .maybeSingle();
    cacheRow = data;
  }
  const categoryReadiness = buildCategoryReadinessFromCache(
    cacheRow
      ? {
          category_id: cacheRow.category_id,
          payload: cacheRow.payload,
          fetched_at: String(cacheRow.fetched_at),
        }
      : undefined,
    (product as Record<string, unknown>).trendyol_category_attributes,
  );
  const trendyolHttpsImageCount = countTrendyolHttpsProductImages(
    (product as { product_images?: { image_url?: string | null }[] | null }).product_images,
  );
  const trendyolReadiness = evaluateTrendyolReadiness(
    {
      is_active: Boolean(product.is_active),
      trendyol_active: Boolean((product as Record<string, unknown>).trendyol_active),
      trendyol_barcode: ((product as Record<string, unknown>).trendyol_barcode as string | null) ?? null,
      trendyol_stock_code: ((product as Record<string, unknown>).trendyol_stock_code as string | null) ?? null,
      sku: (product.sku as string | null) ?? null,
      trendyol_brand: ((product as Record<string, unknown>).trendyol_brand as string | null) ?? null,
      trendyol_category_id: ((product as Record<string, unknown>).trendyol_category_id as string | null) ?? null,
      trendyol_sale_price: Number((product as Record<string, unknown>).trendyol_sale_price ?? product.price ?? 0),
      trendyol_quantity: Number((product as Record<string, unknown>).trendyol_quantity ?? product.stock_quantity ?? 0),
      stock_quantity: Number(product.stock_quantity ?? 0),
      trendyol_vat_rate: Number((product as Record<string, unknown>).trendyol_vat_rate ?? 0),
      trendyol_https_image_count: trendyolHttpsImageCount,
    },
    categoryReadiness,
  );
  const openTrendyol = trendyolReadiness.status !== "ready";

  const trendyolCategoryAttributeDefinitions = cacheRow?.payload
    ? extractCategoryAttributeDefinitions(cacheRow.payload)
    : [];
  const trendyolCategoryAttributePickerRows = cacheRow?.payload
    ? extractCategoryAttributesForPicker(cacheRow.payload)
    : [];
  const importedNeedsReview =
    (!Boolean(product.is_active) &&
      (String((product as Record<string, unknown>).short_description ?? "").includes(TRENDYOL_IMPORTED_REVIEW_NOTE) ||
        String((product as Record<string, unknown>).full_description ?? "").includes(TRENDYOL_IMPORTED_REVIEW_NOTE))) ||
    false;
  const stockQuantity = Number(product.stock_quantity ?? 0);
  const isStockCritical = stockQuantity <= 3;
  const isCategoryMissing = !String((product as Record<string, unknown>).category_id ?? "").trim();
  const isTrendyolActive = Boolean((product as Record<string, unknown>).trendyol_active);
  const isSiteActive = Boolean(product.is_active);

  return (
    <main className="min-h-screen bg-[#f7f4ef]">
      <div className="container-premium py-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#e9e1d6]/70 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:px-5">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl">Ürün Düzenle</h1>
          <p className="mt-1 truncate text-xs font-medium text-stone-500/90">{product.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex h-8 items-center justify-center rounded-xl border border-[#e8dfd3] bg-[#fdfcfa] px-3 text-[11px] font-medium text-stone-600 transition hover:border-[#ddd1c1] hover:bg-white hover:text-stone-700"
          >
            Geri dön
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex h-8 items-center justify-center rounded-xl border border-[#e8dfd3] bg-[#fdfcfa] px-3 text-[11px] font-medium text-stone-600 transition hover:border-[#ddd1c1] hover:bg-white hover:text-stone-700"
          >
            Ürün listesine dön
          </Link>
          <Link
            href={`/urunler/${product.slug}`}
            className="inline-flex h-8 items-center justify-center rounded-xl bg-stone-900 px-3 text-[11px] font-medium text-white shadow-sm transition duration-150 hover:bg-stone-800 hover:shadow-md"
          >
            Önizle
          </Link>
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-[#e9e1d6]/70 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-stone-900">{product.name}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">SKU: {product.sku || "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 whitespace-nowrap">
            {isCategoryMissing ? (
              <span className="rounded-full border border-orange-300/80 bg-orange-100/65 px-1.5 py-px text-[10px] font-medium text-orange-900">
                Kategori eksik
              </span>
            ) : null}
            {isStockCritical ? (
              <span className="rounded-full border border-rose-300/80 bg-rose-100/65 px-1.5 py-px text-[10px] font-medium text-rose-800">
                Stok kritik
              </span>
            ) : null}
            {isTrendyolActive ? (
              <span className="rounded-full border border-emerald-200/90 bg-emerald-50/90 px-1.5 py-px text-[10px] font-medium text-emerald-800">
                Trendyol açık
              </span>
            ) : null}
            {isSiteActive ? (
              <span className="rounded-full border border-sky-200/90 bg-sky-50/90 px-1.5 py-px text-[10px] font-medium text-sky-800">
                Sitede yayında
              </span>
            ) : (
              <span className="rounded-full border border-stone-300/90 bg-stone-100/80 px-1.5 py-px text-[10px] font-medium text-stone-700">
                Sitede kapalı
              </span>
            )}
          </div>
        </div>
      </section>

      {productJsonError ? (
        <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {productJsonError === "invalid_json" ? (
            <span>Trendyol kategori özellikleri geçerli bir JSON dizisi olmalı.</span>
          ) : productJsonError === "invalid_type" ? (
            <span>Trendyol kategori özellikleri yalnızca köşeli parantezli bir dizi ([...]) olmalıdır.</span>
          ) : (
            <span>Kayıt doğrulanamadı.</span>
          )}
        </div>
      ) : null}
      {imageUploadError ? (
        <div className="mb-4 rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-950">
          <span className="font-medium">Görsel işlemi başarısız:</span>{" "}
          <span className="break-words">{imageUploadError}</span>
          {/bucket not found/i.test(imageUploadError) ? (
            <p className="mt-2 text-xs text-rose-900/85">
              Bu hata genelde <strong>kota</strong> değil, Storage’da bucket olmaması demektir. Supabase Dashboard →{" "}
              <strong>Storage</strong> → <strong>New bucket</strong> ile adı tam olarak{" "}
              <code className="rounded bg-rose-100/80 px-1 py-px">product-images</code> olan bir bucket oluşturun
              (genelde <strong>Public</strong> gerekir). Ardından sayfayı yenileyip tekrar deneyin.
            </p>
          ) : (
            <p className="mt-2 text-xs text-rose-900/85">
              Depolama kotası dolmuş, dosya çok büyük veya yükleme izni eksik olabilir. Supabase Dashboard → Storage →
              kullanım ve bucket politikalarını kontrol edin.
            </p>
          )}
        </div>
      ) : null}
      {imageUploadOk ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Görsel yüklendi.
        </div>
      ) : null}
      {imageDeleted ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Görsel silindi.
        </div>
      ) : null}
      {productSaved ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-950">
          Değişiklikler başarıyla kaydedildi.
        </div>
      ) : null}
      {trendyolPushOk ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Trendyol’a gönderim kuyruğa alındı. Sonucu satıcı panelinde veya entegrasyon loglarında kontrol edin.
        </div>
      ) : null}
      {trendyolPushInfo ? (
        <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <span className="font-medium">Trendyol gönderimi:</span>{" "}
          <span className="break-words">{trendyolPushInfo}</span>
        </div>
      ) : null}
      {trendyolPushError ? (
        <div className="mb-4 rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-950">
          <span className="font-medium">Trendyol gönderimi başarısız:</span>{" "}
          <span className="break-words">{trendyolPushError}</span>
        </div>
      ) : null}

      <ProductForm
        mode="edit"
        initialProduct={{ ...(product as Record<string, unknown>), id }}
        productUpdatedAt={String((product as { updated_at?: string }).updated_at ?? "") || null}
        importedNeedsReview={importedNeedsReview}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
        collections={(collections ?? []).map((c) => ({ id: c.id, name: c.name }))}
        trendyolReadiness={trendyolReadiness}
        trendyolCategoryAttributeDefinitions={trendyolCategoryAttributeDefinitions}
        trendyolCategoryAttributePickerRows={trendyolCategoryAttributePickerRows}
        openTrendyolByDefault={openTrendyol}
        returnTo={`/admin/products/${id}/edit`}
        uploadProductImageAction={uploadProductImage}
        deleteProductImageAction={deleteProductImage}
        pushTrendyolProductAndInventoryAction={pushTrendyolProductAndInventoryFromForm}
        saveProductAction={saveProduct}
      />
      </div>
    </main>
  );
}
