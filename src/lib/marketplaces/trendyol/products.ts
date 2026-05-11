import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTrendyolBatchErrors } from "@/lib/marketplaces/trendyol/batch-errors";
import {
  getActiveTrendyolIntegration,
  logMarketplaceSync,
  trendyolHasCredentials,
  trendyolRequest,
} from "@/lib/marketplaces/trendyol/client";
import { parseTrendyolPositiveIntId } from "@/lib/marketplaces/trendyol/int-ids";

/** DB row shape used to build the Trendyol v2/products POST body (single item in `items`). */
export type TrendyolProductPayloadInput = {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  price: number;
  is_active: boolean;
  trendyol_active: boolean;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  /** Trendyol marka listesindeki sayısal marka ID (metin marka adı değil). */
  trendyol_brand: string | null;
  trendyol_category_id: string | null;
  trendyol_category_attributes: unknown;
  trendyol_vat_rate: number | null;
  trendyol_list_price: number | null;
  trendyol_sale_price: number | null;
  trendyol_quantity: number | null;
  trendyol_dimensional_weight: number | null;
  /** Ürün görselleri — Trendyol v2 create için en az bir https URL gerekir. */
  product_images?: { image_url?: string | null }[] | null;
};

type TrendyolProductRow = TrendyolProductPayloadInput;

function buildTrendyolImageItems(p: TrendyolProductRow): { url: string }[] {
  const rows = Array.isArray(p.product_images) ? p.product_images : [];
  const urls = rows
    .map((r) => String((r as { image_url?: string | null })?.image_url ?? "").trim())
    .filter((u) => /^https:\/\//i.test(u))
    .slice(0, 8);
  return urls.map((url) => ({ url }));
}

export const TRENDYOL_IMPORTED_REVIEW_NOTE = "Trendyol'dan içe aktarılan ürün.";

/** Trendyol v2 create gövdesi (önizleme: eksik ID’ler 0, görseller boş olabilir — analyze yakalar). */
function buildProductPayloadItem(p: TrendyolProductRow): Record<string, unknown> {
  const barcode = p.trendyol_barcode?.trim() || p.sku;
  const stockCode = p.trendyol_stock_code?.trim() || p.sku;
  const salePrice = Number(p.trendyol_sale_price ?? 0);
  const listPrice = Number(p.trendyol_list_price ?? p.trendyol_sale_price ?? 0);
  const brandId = parseTrendyolPositiveIntId(p.trendyol_brand) ?? 0;
  const categoryId = parseTrendyolPositiveIntId(p.trendyol_category_id) ?? 0;
  const images = buildTrendyolImageItems(p);
  return {
    barcode,
    title: p.name,
    productMainId: stockCode,
    brandId,
    categoryId,
    quantity: p.stock_quantity,
    stockCode,
    dimensionalWeight: Number(p.trendyol_dimensional_weight ?? 1),
    description: p.name,
    currencyType: "TRY",
    listPrice,
    salePrice,
    vatRate: Number(p.trendyol_vat_rate ?? 20),
    images,
    attributes: Array.isArray(p.trendyol_category_attributes) ? p.trendyol_category_attributes : [],
  };
}

/** Same mapping as `syncProductToTrendyol` — no HTTP, no DB writes. */
export function buildTrendyolProductPayload(product: TrendyolProductPayloadInput) {
  return { items: [buildProductPayloadItem(product as TrendyolProductRow)] };
}

export type TrendyolPayloadPreviewIssue = {
  path: string;
  message: string;
  level: "error" | "warning" | "info";
};

function nonEmptyString(v: unknown): boolean {
  return String(v ?? "").trim().length > 0;
}

/** Dry-run checks on the outbound JSON (admin preview). */
export function analyzeTrendyolProductPayloadIssues(
  body: ReturnType<typeof buildTrendyolProductPayload>,
): TrendyolPayloadPreviewIssue[] {
  const issues: TrendyolPayloadPreviewIssue[] = [];
  const item = body.items?.[0];
  if (!item) {
    issues.push({ path: "items", message: "Gönderilecek ürün yok (items boş).", level: "error" });
    return issues;
  }

  if (!nonEmptyString(item.title)) {
    issues.push({ path: "items[0].title", message: "Başlık (title) boş.", level: "error" });
  }
  if (!nonEmptyString(item.barcode)) {
    issues.push({ path: "items[0].barcode", message: "Barkod (barcode) boş.", level: "error" });
  }
  if (!nonEmptyString(item.stockCode)) {
    issues.push({ path: "items[0].stockCode", message: "Stok kodu (stockCode) boş.", level: "error" });
  }
  if (!nonEmptyString(item.productMainId)) {
    issues.push({ path: "items[0].productMainId", message: "productMainId boş.", level: "error" });
  }
  const row = item as Record<string, unknown>;
  const brandId = Number(row.brandId);
  if (!Number.isFinite(brandId) || brandId <= 0) {
    issues.push({
      path: "items[0].brandId",
      message:
        "Trendyol marka ID (tam sayı) zorunludur. Marka alanına marka adı değil, Trendyol marka listesindeki sayısal ID’yi yazın.",
      level: "error",
    });
  }

  const categoryId = Number(row.categoryId);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    issues.push({
      path: "items[0].categoryId",
      message: "Trendyol kategori ID geçersiz veya eksik (0 olmamalı).",
      level: "error",
    });
  }

  const imgs = row.images;
  if (!Array.isArray(imgs) || imgs.length === 0) {
    issues.push({
      path: "items[0].images",
      message:
        "Trendyol ürün oluşturma en az bir https görsel URL’si ister. Görselleri yükleyin (Supabase public https URL).",
      level: "error",
    });
  }

  const qty = Number(item.quantity);
  if (!Number.isFinite(qty)) {
    issues.push({ path: "items[0].quantity", message: "Adet (quantity) sayı değil.", level: "error" });
  } else if (qty < 0) {
    issues.push({ path: "items[0].quantity", message: "Adet (quantity) negatif.", level: "warning" });
  }

  for (const key of ["listPrice", "salePrice"] as const) {
    const n = Number(item[key]);
    if (!Number.isFinite(n) || n <= 0) {
      issues.push({
        path: `items[0].${key}`,
        message: `${key} geçerli pozitif bir sayı olmalı.`,
        level: "error",
      });
    }
  }

  const vat = Number(item.vatRate);
  if (!Number.isFinite(vat)) {
    issues.push({ path: "items[0].vatRate", message: "KDV oranı (vatRate) geçersiz.", level: "warning" });
  }

  const dw = Number(item.dimensionalWeight);
  if (!Number.isFinite(dw) || dw <= 0) {
    issues.push({
      path: "items[0].dimensionalWeight",
      message: "Desi (dimensionalWeight) pozitif bir sayı olmalı.",
      level: "warning",
    });
  }

  if (!nonEmptyString(item.description)) {
    issues.push({ path: "items[0].description", message: "Açıklama (description) boş.", level: "warning" });
  }

  const attrs = item.attributes;
  if (!Array.isArray(attrs)) {
    issues.push({
      path: "items[0].attributes",
      message: "Özellikler (attributes) bir JSON dizisi olmalı.",
      level: "error",
    });
  } else {
    if (attrs.length === 0) {
      issues.push({
        path: "items[0].attributes",
        message: "Özellik dizisi boş — kategori zorunlu alanlar eksik kalabilir.",
        level: "warning",
      });
    }
    attrs.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") {
        issues.push({
          path: `items[0].attributes[${i}]`,
          message: `Özellik #${i + 1}: geçersiz nesne.`,
          level: "warning",
        });
        return;
      }
      const o = raw as Record<string, unknown>;
      const hasValueId = o.attributeValueId != null && String(o.attributeValueId).trim() !== "";
      const hasCustom =
        o.customAttributeValue != null && String(o.customAttributeValue).trim() !== "";
      if (!hasValueId && !hasCustom) {
        issues.push({
          path: `items[0].attributes[${i}]`,
          message: `Özellik #${i + 1}: attributeValueId veya customAttributeValue dolu olmalı.`,
          level: "warning",
        });
      }
    });
  }

  return issues;
}

/** Kayıtlı ürün satırının üzerine yazılır (ör. gönderim öncesi formdan gelen canlı değerler). */
export type TrendyolProductSyncOverrides = Partial<TrendyolProductPayloadInput>;

export async function syncProductToTrendyol(
  admin: SupabaseClient,
  productId: string,
  opts?: { overrides?: TrendyolProductSyncOverrides },
) {
  const [integration, productRes] = await Promise.all([
    getActiveTrendyolIntegration(admin),
    admin
      .from("products")
      .select(
        "id,name,sku,stock_quantity,price,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_brand,trendyol_category_id,trendyol_category_attributes,trendyol_vat_rate,trendyol_list_price,trendyol_sale_price,trendyol_quantity,trendyol_dimensional_weight,product_images(image_url)",
      )
      .eq("id", productId)
      .maybeSingle(),
  ]);

  let product = productRes.data as TrendyolProductRow | null;
  if (!product) return { ok: false as const, message: "Ürün bulunamadı." };
  const ov = opts?.overrides;
  if (ov && Object.keys(ov).length > 0) {
    product = { ...product, ...ov } as TrendyolProductRow;
  }

  if (!product.is_active || !product.trendyol_active) {
    await logMarketplaceSync(admin, {
      integrationId: integration?.id ?? null,
      entityType: "product",
      entityId: productId,
      action: "product_sync",
      status: "skipped",
      message: "Product is inactive or Trendyol sync disabled.",
    });
    return { ok: true as const, skipped: true };
  }

  if (!integration || !trendyolHasCredentials(integration)) {
    await logMarketplaceSync(admin, {
      integrationId: integration?.id ?? null,
      entityType: "product",
      entityId: productId,
      action: "product_sync",
      status: "skipped",
      message: "Credentials missing. Sync skipped until credentials are added.",
    });
    return { ok: true as const, skipped: true };
  }

  const sellerId = asTrimmedString(integration.seller_id);
  if (!sellerId) {
    return { ok: false as const, message: "Trendyol seller_id eksik." };
  }

  const brandRaw = String(product.trendyol_brand ?? "").trim();
  const brandId = parseTrendyolPositiveIntId(product.trendyol_brand);
  const categoryId = parseTrendyolPositiveIntId(product.trendyol_category_id);
  const imageItems = buildTrendyolImageItems(product);
  if (!brandId) {
    const looksLikeBrandName = brandRaw.length > 0 && !/^\d+$/.test(brandRaw);
    const legacy = looksLikeBrandName
      ? `Şu an alanda marka adı gibi metin var («${brandRaw.slice(0, 48)}${brandRaw.length > 48 ? "…" : ""}»). Eski içe aktarma sürümü marka adını kaydediyordu — alanı sayısal ID ile değiştirin veya ürünü Trendyol’dan yeniden içe aktarın. `
      : "";
    const hint =
      "Ürün formunda «Marka ID (Trendyol)» alanına yalnızca rakamlardan oluşan ID yazın; «Marka ara» ile bulup «Bu ID’yi yaz» kullanabilirsiniz.";
    return {
      ok: false as const,
      message: `${legacy}Trendyol marka ID eksik veya geçersiz. ${hint} (API: getBrands / brands/by-name.)`,
    };
  }
  if (!categoryId) {
    return {
      ok: false as const,
      message:
        "Trendyol kategori ID geçersiz veya boş. Kategori ID alanına yalnızca sayı girin (ör. 3500).",
    };
  }
  if (imageItems.length === 0) {
    return {
      ok: false as const,
      message:
        "Trendyol ürün oluşturma için en az bir https ürün görseli gerekir. Görseller bölümünden yükleyin, kaydedin, sonra tekrar gönderin.",
    };
  }

  const payload = buildTrendyolProductPayload(product);

  try {
    const response = await trendyolRequest<{ batchRequestId?: string }>({
      integration,
      method: "POST",
      path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/v2/products`,
      body: payload,
    });
    const batchRequestId = response.batchRequestId ?? null;
    await admin.from("marketplace_product_links").upsert(
      {
        integration_id: integration.id,
        marketplace: "trendyol",
        product_id: productId,
        barcode: product.trendyol_barcode ?? product.sku,
        stock_code: product.trendyol_stock_code ?? product.sku,
        batch_request_id: batchRequestId,
        status: "pending",
        last_payload: payload,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "integration_id,product_id" },
    );
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "product",
      entityId: productId,
      action: "product_sync",
      status: "pending",
      message: "Product create/update batch sent.",
      batchRequestId,
      requestPayload: payload,
      responsePayload: response,
    });
    return { ok: true as const, batchRequestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Trendyol sync error";
    await admin.from("marketplace_product_links").upsert(
      {
        integration_id: integration.id,
        marketplace: "trendyol",
        product_id: productId,
        status: "failed",
        last_error: message,
        last_payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "integration_id,product_id" },
    );
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "product",
      entityId: productId,
      action: "product_sync",
      status: "error",
      message,
      requestPayload: payload,
    });
    return { ok: false as const, message };
  }
}

const BATCH_LOG_ITEMS_CAP = 120;

export async function checkTrendyolProductBatchStatus(admin: SupabaseClient, batchRequestId: string) {
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration || !trendyolHasCredentials(integration)) {
    return { ok: false as const, message: "Trendyol credentials missing." };
  }
  const sellerId = asTrimmedString(integration.seller_id);
  if (!sellerId) {
    return { ok: false as const, message: "Trendyol seller_id eksik." };
  }
  try {
    const response = await trendyolRequest<unknown>({
      integration,
      method: "GET",
      path: `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/batch-requests/${encodeURIComponent(batchRequestId)}`,
    });
    const parseResult = parseTrendyolBatchErrors(response);
    const apiStatus =
      response && typeof response === "object" && "status" in response
        ? String((response as Record<string, unknown>).status ?? "").trim() || "bilinmiyor"
        : "bilinmiyor";

    let message: string;
    if (parseResult.items.length === 0) {
      message = `Batch sorgusu tamamlandı (durum: ${apiStatus}). Ürün satırı dönmedi; gerekirse ham yanıtı inceleyin.`;
    } else {
      message = `Batch sonucu: ${parseResult.successfulCount} başarılı, ${parseResult.failedCount} hatalı, ${parseResult.unknownCount} belirsiz (durum: ${apiStatus})`;
      if (parseResult.failedCount > 0) {
        const first = parseResult.items.find((i) => i.outcome === "failed");
        if (first?.friendlyMessage) message += `. Örnek: ${first.friendlyMessage}`;
      }
    }

    const itemsStored = parseResult.items.slice(0, BATCH_LOG_ITEMS_CAP);
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "batch",
      entityId: batchRequestId,
      action: "batch_status_check",
      status: "success",
      message,
      batchRequestId,
      responsePayload: response,
      metadata: {
        trendyolBatchParse: {
          successfulCount: parseResult.successfulCount,
          failedCount: parseResult.failedCount,
          unknownCount: parseResult.unknownCount,
          itemsTotal: parseResult.items.length,
          itemsTruncated: parseResult.items.length > BATCH_LOG_ITEMS_CAP,
          items: itemsStored,
          apiStatus: apiStatus === "bilinmiyor" ? null : apiStatus,
        },
      },
    });
    return { ok: true as const, response };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Batch status check failed";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "batch",
      entityId: batchRequestId,
      action: "batch_status_check",
      status: "error",
      message,
      batchRequestId,
    });
    return { ok: false as const, message };
  }
}

type TrendyolRemoteImage = {
  url?: unknown;
};

type TrendyolRemoteProduct = {
  title?: unknown;
  productMainId?: unknown;
  barcode?: unknown;
  brand?: unknown;
  salePrice?: unknown;
  listPrice?: unknown;
  quantity?: unknown;
  images?: unknown;
  variants?: unknown;
};

function asTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function slugifyForImport(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/**
 * Trendyol ürün listesindeki `brand`: genelde `{ id, name }`. Veritabanında yalnızca sayısal marka ID saklanır
 * (createProduct v2 `brandId`). Eski içe aktarmalar yalnızca ad yazdığı için gönderim başarısız oluyordu.
 */
function resolveTrendyolBrandIdForImport(rawBrand: unknown): string | null {
  if (rawBrand && typeof rawBrand === "object") {
    const o = rawBrand as Record<string, unknown>;
    const id = o.id;
    if (typeof id === "number" && Number.isFinite(id) && Math.trunc(id) > 0) {
      return String(Math.trunc(id));
    }
    if (typeof id === "string") {
      const t = id.trim();
      if (/^\d+$/.test(t)) {
        const n = Number(t);
        if (Number.isFinite(n) && n > 0) return String(Math.trunc(n));
      }
    }
  }
  const s = asTrimmedString(rawBrand);
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return String(Math.trunc(n));
  }
  return null;
}

function normalizeRemoteImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (typeof img === "string") return asTrimmedString(img);
      if (img && typeof img === "object") {
        return asTrimmedString((img as TrendyolRemoteImage).url);
      }
      return "";
    })
    .filter(Boolean);
}

function firstVariant(item: TrendyolRemoteProduct): Record<string, unknown> | null {
  if (!Array.isArray(item.variants) || item.variants.length === 0) return null;
  const v = item.variants[0];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function extractRemoteBarcode(item: TrendyolRemoteProduct): string {
  const direct = asTrimmedString(item.barcode);
  if (direct) return direct;
  const variant = firstVariant(item);
  return asTrimmedString(variant?.barcode);
}

function extractRemoteStockCode(item: TrendyolRemoteProduct): string {
  const direct = asTrimmedString(item.productMainId);
  if (direct) return direct;
  const variant = firstVariant(item);
  return asTrimmedString(variant?.stockCode);
}

function extractRemoteSalePrice(item: TrendyolRemoteProduct): number {
  if (Number.isFinite(Number(item.salePrice))) return asNumber(item.salePrice, 0);
  const variant = firstVariant(item);
  const priceObj = variant?.price as Record<string, unknown> | undefined;
  return asNumber(priceObj?.salePrice, 0);
}

function extractRemoteListPrice(item: TrendyolRemoteProduct): number {
  if (Number.isFinite(Number(item.listPrice))) return asNumber(item.listPrice, 0);
  const variant = firstVariant(item);
  const priceObj = variant?.price as Record<string, unknown> | undefined;
  return asNumber(priceObj?.listPrice, 0);
}

function extractRemoteQuantity(item: TrendyolRemoteProduct): number {
  if (Number.isFinite(Number(item.quantity))) return asNumber(item.quantity, 0);
  const variant = firstVariant(item);
  const stockObj = variant?.stock as Record<string, unknown> | undefined;
  return asNumber(stockObj?.quantity, 0);
}

function isVariantOnSale(item: TrendyolRemoteProduct): boolean {
  const variant = firstVariant(item);
  if (!variant) return false;
  return Boolean(variant.onSale);
}

async function fetchTrendyolProductsAllPages(
  integration: NonNullable<Awaited<ReturnType<typeof getActiveTrendyolIntegration>>>,
  approved: boolean | null,
) {
  const sellerId = asTrimmedString(integration.seller_id);
  if (!sellerId) {
    throw new Error("Trendyol seller_id bulunamadı.");
  }
  if (approved === false) {
    return [];
  }
  const size = 100;
  const maxPages = 25;
  const all: TrendyolRemoteProduct[] = [];
  let nextPageToken: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const qs = new URLSearchParams();
    qs.set("size", String(size));
    if (nextPageToken) {
      qs.set("nextPageToken", nextPageToken);
    } else {
      qs.set("page", String(page));
    }
    const path = `/integration/product/sellers/${encodeURIComponent(sellerId)}/products/approved?${qs.toString()}`;
    const response = await trendyolRequest<{ content?: TrendyolRemoteProduct[]; nextPageToken?: string | null }>({
      integration,
      method: "GET",
      path,
    });
    const list = response.content ?? [];
    if (list.length === 0) break;
    all.push(...list);
    if (list.length < size) break;
    const token = asTrimmedString(response.nextPageToken);
    if (!token) break;
    nextPageToken = token;
  }

  return all;
}

export async function testTrendyolProductsAccess(admin: SupabaseClient) {
  const integration = await getActiveTrendyolIntegration(admin);
  const environment = integration?.environment ?? null;
  const sellerId = integration?.seller_id ? asTrimmedString(integration.seller_id) : "";
  const endpoint = sellerId
    ? `/integration/product/sellers/${sellerId}/products/approved?size=20&page=0`
    : "/integration/product/sellers/{sellerId}/products/approved?size=20&page=0";

  if (!integration || !trendyolHasCredentials(integration)) {
    return {
      ok: false as const,
      message: "Trendyol entegre değil veya API bilgileri eksik.",
      environment,
      endpoint,
    };
  }
  if (!sellerId) {
    return {
      ok: false as const,
      message: "Trendyol seller_id eksik.",
      environment,
      endpoint,
    };
  }
  try {
    const approvedProducts = await fetchTrendyolProductsAllPages(integration, true);
    const allProducts = approvedProducts.length > 0 ? approvedProducts : await fetchTrendyolProductsAllPages(integration, null);
    const first = allProducts[0];
    const sample = first
      ? {
          title: asTrimmedString(first.title),
          barcode: extractRemoteBarcode(first),
          productMainId: extractRemoteStockCode(first),
        }
      : null;
    return {
      ok: true as const,
      approvedCount: approvedProducts.length,
      totalCount: allProducts.length,
      sample,
      environment,
      sellerId,
      endpoint,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trendyol bağlantı testi başarısız.";
    return { ok: false as const, message, environment, sellerId, endpoint };
  }
}

export async function importApprovedProductsFromTrendyol(admin: SupabaseClient, dryRun = true) {
  const integration = await getActiveTrendyolIntegration(admin);
  if (!integration || !trendyolHasCredentials(integration)) {
    await logMarketplaceSync(admin, {
      integrationId: integration?.id ?? null,
      entityType: "import",
      action: "import_approved_products",
      status: "skipped",
      message: "Credentials missing. Import skipped.",
    });
    return { ok: true as const, skipped: true, imported: 0 };
  }
  const sellerId = asTrimmedString(integration.seller_id);
  if (!sellerId) {
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "import",
      action: "import_approved_products",
      status: "skipped",
      message: "Seller id missing. Import skipped.",
    });
    return { ok: true as const, skipped: true, imported: 0 };
  }
  try {
    let list = await fetchTrendyolProductsAllPages(integration, true);
    if (list.length === 0) {
      list = await fetchTrendyolProductsAllPages(integration, null);
    }
    const importableList = list.filter((item) => {
      const stockQuantity = Math.max(0, Math.trunc(extractRemoteQuantity(item)));
      return isVariantOnSale(item) && stockQuantity > 0;
    });
    let imported = 0;
    let updated = 0;
    let deactivated = 0;

    const barcodes = [...new Set(importableList.map((item) => extractRemoteBarcode(item)).filter(Boolean))];
    const fetchedBarcodes = [...new Set(list.map((item) => extractRemoteBarcode(item)).filter(Boolean))];
    const importableBarcodeSet = new Set(barcodes);
    const existingByBarcode = new Map<string, { id: string }>();
    if (barcodes.length > 0) {
      const { data: existingRows } = await admin
        .from("products")
        .select("id,trendyol_barcode")
        .in("trendyol_barcode", barcodes);
      for (const row of existingRows ?? []) {
        const barcode = asTrimmedString((row as { trendyol_barcode?: unknown }).trendyol_barcode);
        const id = asTrimmedString((row as { id?: unknown }).id);
        if (barcode && id) existingByBarcode.set(barcode, { id });
      }
    }

    if (!dryRun) {
      for (const item of importableList) {
        const name = asTrimmedString(item.title);
        const sku = extractRemoteStockCode(item);
        const barcode = extractRemoteBarcode(item);
        if (!name || !sku || !barcode) continue;

        const trendyolBrandId = resolveTrendyolBrandIdForImport(item.brand);
        const price = extractRemoteSalePrice(item);
        const compareAtPrice = extractRemoteListPrice(item);
        const stockQuantity = Math.max(0, Math.trunc(extractRemoteQuantity(item)));
        const imageUrls = normalizeRemoteImages(item.images);
        const description = `${name} - ${TRENDYOL_IMPORTED_REVIEW_NOTE}`;

        const existing = existingByBarcode.get(barcode);
        if (existing) {
          await admin
            .from("products")
            .update({
              name,
              sku,
              trendyol_barcode: barcode,
              trendyol_brand: trendyolBrandId,
              price,
              compare_at_price: compareAtPrice > 0 ? compareAtPrice : null,
              stock_quantity: stockQuantity,
              trendyol_stock_code: sku,
              is_active: false,
            })
            .eq("id", existing.id);

          await admin.from("product_images").delete().eq("product_id", existing.id);
          if (imageUrls.length > 0) {
            await admin.from("product_images").insert(
              imageUrls.map((imageUrl, index) => ({
                product_id: existing.id,
                image_url: imageUrl,
                is_cover: index === 0,
                sort_order: index,
              })),
            );
          }
          updated += 1;
          continue;
        }

        const slugBase = slugifyForImport(name) || "trendyol-urun";
        const slug = `${slugBase}-${barcode.slice(-8).toLocaleLowerCase("tr-TR")}`;
        const { data: inserted, error: insertError } = await admin
          .from("products")
          .insert({
            name,
            slug,
            short_description: description,
            full_description: description,
            price,
            compare_at_price: compareAtPrice > 0 ? compareAtPrice : null,
            sku,
            stock_quantity: stockQuantity,
            category_id: null,
            collection_id: null,
            is_active: false,
            trendyol_active: false,
            trendyol_barcode: barcode,
            trendyol_brand: trendyolBrandId,
            trendyol_stock_code: sku,
          })
          .select("id")
          .maybeSingle();
        if (insertError || !inserted?.id) continue;

        if (imageUrls.length > 0) {
          await admin.from("product_images").insert(
            imageUrls.map((imageUrl, index) => ({
              product_id: inserted.id,
              image_url: imageUrl,
              is_cover: index === 0,
              sort_order: index,
            })),
          );
        }
        existingByBarcode.set(barcode, { id: inserted.id });
        imported += 1;
      }

      if (fetchedBarcodes.length > 0) {
        const { data: remoteLinkedRows } = await admin
          .from("products")
          .select("id,trendyol_barcode,trendyol_active,is_active")
          .in("trendyol_barcode", fetchedBarcodes);

        const toDeactivateIds = (remoteLinkedRows ?? [])
          .filter((row) => {
            const barcode = asTrimmedString((row as { trendyol_barcode?: unknown }).trendyol_barcode);
            const trendyolActive = Boolean((row as { trendyol_active?: unknown }).trendyol_active);
            return barcode && !importableBarcodeSet.has(barcode) && trendyolActive;
          })
          .map((row) => asTrimmedString((row as { id?: unknown }).id))
          .filter(Boolean);

        if (toDeactivateIds.length > 0) {
          const { error: deactivateError } = await admin
            .from("products")
            .update({
              trendyol_active: false,
            })
            .in("id", toDeactivateIds);

          if (!deactivateError) {
            deactivated = toDeactivateIds.length;
          }
        }
      }
    }
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "import",
      action: "import_approved_products",
      status: "success",
      message: dryRun
        ? `Dry-run complete. ${importableList.length}/${list.length} ürün (satışta + stokta) eşleşme için getirildi.`
        : `${imported} ürün eklendi, ${updated} ürün güncellendi, ${deactivated} ürün pasife alındı.`,
      responsePayload: {
        count: importableList.length,
        fetchedCount: list.length,
        dryRun,
        imported,
        updated,
        deactivated,
        filter: "onSale_and_inStock",
      },
    });
    return { ok: true as const, count: importableList.length, fetchedCount: list.length, imported, updated, deactivated, dryRun };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    await logMarketplaceSync(admin, {
      integrationId: integration.id,
      entityType: "import",
      action: "import_approved_products",
      status: "error",
      message,
    });
    return { ok: false as const, message };
  }
}
