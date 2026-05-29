import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteProductImage,
  pushTrendyolProductAndInventoryFromForm,
  saveProduct,
  setProductCoverImage,
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
/** Kaydet / görsel yükleme server action süresi (Vercel). */
export const maxDuration = 60;

export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    productJsonError?: string;
    imageUploadError?: string;
    imageUploadOk?: string;
    imageCoverSet?: string;
    imageDeleted?: string;
    productSaved?: string;
    productSaveError?: string;
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
  const imageCoverSet = sp.imageCoverSet === "1";
  const imageDeleted = sp.imageDeleted === "1";
  const productSaved = sp.productSaved === "1";
  const productSaveError = sp.productSaveError ?? "";
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
    <main className="min-h-dvh bg-[#eceae6]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-stone-200/60 pb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold tracking-tight text-stone-900">Ürün düzenle</h1>
            <p className="mt-0.5 truncate text-[12px] font-medium text-stone-800">{product.name}</p>
            <p className="mt-0.5 text-[10px] text-stone-500">SKU: {product.sku || "—"}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {isCategoryMissing ? (
                <span className="rounded border border-orange-200/80 bg-orange-50 px-1 py-px text-[9px] font-medium text-orange-900">Kategori eksik</span>
              ) : null}
              {isStockCritical ? (
                <span className="rounded border border-rose-200/80 bg-rose-50 px-1 py-px text-[9px] font-medium text-rose-800">Stok kritik</span>
              ) : null}
              {isTrendyolActive ? (
                <span className="rounded border border-emerald-200/80 bg-emerald-50 px-1 py-px text-[9px] font-medium text-emerald-800">Trendyol açık</span>
              ) : null}
              {isSiteActive ? (
                <span className="rounded border border-sky-200/80 bg-sky-50 px-1 py-px text-[9px] font-medium text-sky-800">Vitrinde</span>
              ) : (
                <span className="rounded border border-stone-200 bg-stone-100 px-1 py-px text-[9px] font-medium text-stone-700">Vitrin kapalı</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Link
              href="/admin/products"
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 hover:bg-stone-50"
            >
              Liste
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-medium text-stone-600 hover:bg-stone-100"
            >
              Panel
            </Link>
            <Link
              href={`/urunler/${product.slug}`}
              className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-stone-800"
            >
              Önizle
            </Link>
          </div>
        </div>

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
      {imageCoverSet ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Kapak görseli güncellendi. Anasayfa ve ürün listesi birkaç saniye içinde yansır.
        </div>
      ) : null}
      {imageDeleted ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          Görsel silindi.
        </div>
      ) : null}
      {productSaveError ? (
        <div className="mb-4 rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-950">
          <p className="font-medium">Değişiklikler kaydedilemedi.</p>
          <p className="mt-1 break-words text-xs text-rose-900/90">{productSaveError}</p>
          {/uuid/i.test(productSaveError) ? (
            <p className="mt-2 text-xs text-rose-900/85">
              Genellikle <strong>Kategori</strong> seçilmediğinde olur. Aşağıdan bir kategori seçip tekrar kaydedin.
            </p>
          ) : null}
        </div>
      ) : null}
      {productSaved ? (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">Değişiklikler başarıyla kaydedildi.</p>
          <p className="mt-1 text-xs text-emerald-900/90">
            Trendyol güncellemesi için aşağıdaki «Trendyol&apos;a gönder» düğmesini kullanın (kayıt sırasında API beklenmez).
          </p>
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
        setProductCoverImageAction={setProductCoverImage}
        pushTrendyolProductAndInventoryAction={pushTrendyolProductAndInventoryFromForm}
        saveProductAction={saveProduct}
      />
      </div>
    </main>
  );
}
