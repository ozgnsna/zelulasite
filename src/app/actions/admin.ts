"use server";

import { revalidatePath } from "next/cache";

function revalidateAdminOrderPaths(orderId: string) {
  revalidatePath("/admin");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}
import { redirect } from "next/navigation";
import { normalizeEmailInput } from "@/lib/account/email-input";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncLoyaltyLedgersForOrder } from "@/lib/loyalty/sync-order-ledger";
import { countTrendyolHttpsProductImages } from "@/lib/marketplaces/trendyol/int-ids";
import { ZELULA_TRENDYOL_BRAND_ID, ZELULA_TRENDYOL_VAT_RATE } from "@/lib/marketplaces/trendyol/shop-defaults";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";
import {
  analyzeTrendyolProductPayloadIssues,
  buildTrendyolProductPayload,
  checkTrendyolProductBatchStatus,
  importApprovedProductsFromTrendyol,
  syncProductToTrendyol,
  testTrendyolProductsAccess,
  type TrendyolProductPayloadInput,
  type TrendyolProductSyncOverrides,
} from "@/lib/marketplaces/trendyol/products";
import { fetchTrendyolOrdersForSync } from "@/lib/marketplaces/trendyol/orders";
import {
  buildCategoryReadinessFromCache,
  extractCategoryAttributesForPicker,
  fetchTrendyolCategoryAttributesCached,
  type TrendyolCategoryAttributePickerRow,
} from "@/lib/marketplaces/trendyol/categories";
import {
  fetchTrendyolCategoryTreeCached,
  searchTrendyolCategoryLeaves,
  type TrendyolCategoryLeaf,
} from "@/lib/marketplaces/trendyol/category-tree";
import { fetchTrendyolBrandsByName, type TrendyolBrandHit } from "@/lib/marketplaces/trendyol/brands";
import { evaluateTrendyolReadiness } from "@/lib/marketplaces/trendyol/readiness";

function normalizeTrendyolUiError(message: string) {
  const raw = String(message ?? "");
  const lower = raw.toLowerCase();
  if (
    /\bhttp\s*556\b|\bhttp\s*503\b|\bhttp\s*502\b|\bhttp\s*504\b|\bhttp\s*429\b/i.test(raw) ||
    /service unavailable/i.test(raw)
  ) {
    return "Trendyol fiyat/stok servisi geçici olarak yanıt vermedi (çoğunlukla Trendyol altyapı yoğunluğu). Birkaç dakika sonra tekrar deneyin; yineliyorsa Trendyol paneli veya destek ile doğrulayın.";
  }
  const isCloudflareBlocked =
    lower.includes("cloudflare_block") ||
    (lower.includes("cloudflare") && (lower.includes("blocked") || lower.includes("ray id")));

  if (isCloudflareBlocked) {
    const rayIdMatch =
      raw.match(/"rayId":"([0-9a-f]{8,32})"/i) ??
      raw.match(/ray id:\s*[^0-9a-f]*([0-9a-f]{8,32})/i);
    const rayId = rayIdMatch?.[1];
    return rayId
      ? `Trendyol erişimi Cloudflare tarafından engellendi (Ray ID: ${rayId})`
      : "Trendyol erişimi Cloudflare tarafından engellendi";
  }
  return raw;
}

export async function signInAdmin(formData: FormData) {
  const email = normalizeEmailInput(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return;
  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

function adminProductsListSearchParamsFromForm(formData: FormData): URLSearchParams {
  const p = new URLSearchParams();
  const q = String(formData.get("q") ?? "").trim();
  if (q) p.set("q", q);
  for (const key of ["status", "trendyol", "stock", "review", "sales"] as const) {
    const v = String(formData.get(key) ?? "").trim();
    if (v && v !== "all") p.set(key, v);
  }
  return p;
}

export async function bulkDeleteProductsAction(formData: FormData) {
  const admin = createAdminClient();
  const selected = formData
    .getAll("product_ids")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const uniqueIds = [...new Set(selected)];
  const confirmed = formData.get("confirm_delete") === "on";
  const confirmationText = String(formData.get("confirm_text") ?? "").trim().toUpperCase();
  const base = adminProductsListSearchParamsFromForm(formData);

  if (uniqueIds.length === 0) {
    base.set("deleteError", "no_selection");
    redirect(`/admin/products?${base.toString()}`);
  }
  if (!confirmed || confirmationText !== "SIL") {
    base.set("deleteError", "confirm_required");
    redirect(`/admin/products?${base.toString()}`);
  }

  const { error } = await admin.from("products").delete().in("id", uniqueIds);
  if (error) {
    base.set("deleteError", "delete_failed");
    redirect(`/admin/products?${base.toString()}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  base.set("deleted", String(uniqueIds.length));
  redirect(`/admin/products?${base.toString()}`);
}

/** Ürün listesi: tek formdan silme / Trendyol gönder / fiyat-stok senk. — mevcut işlevleri çağırır. */
export async function adminProductsListBulkAction(formData: FormData) {
  const intent = String(formData.get("intent") ?? "").trim();
  if (intent === "delete") return bulkDeleteProductsAction(formData);

  const admin = createAdminClient();
  const selected = formData
    .getAll("product_ids")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const uniqueIds = [...new Set(selected)];
  const base = adminProductsListSearchParamsFromForm(formData);

  if (uniqueIds.length === 0) {
    base.set("deleteError", "no_selection");
    redirect(`/admin/products?${base.toString()}`);
  }

  if (intent === "trendyol_send") {
    for (const id of uniqueIds) {
      await syncProductToTrendyol(admin, id);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    base.set("bulkOk", "trendyol");
    base.set("bulkCount", String(uniqueIds.length));
    redirect(`/admin/products?${base.toString()}`);
  }

  if (intent === "price_sync") {
    await syncPriceInventoryForProducts(admin, uniqueIds, "admin_products_list_bulk");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    base.set("bulkOk", "price");
    base.set("bulkCount", String(uniqueIds.length));
    redirect(`/admin/products?${base.toString()}`);
  }

  if (intent === "disable") {
    const { error } = await admin.from("products").update({ is_active: false }).in("id", uniqueIds);
    if (error) {
      base.set("bulkError", "disable_failed");
      redirect(`/admin/products?${base.toString()}`);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    base.set("bulkOk", "disable");
    base.set("bulkCount", String(uniqueIds.length));
    redirect(`/admin/products?${base.toString()}`);
  }

  redirect(`/admin/products?${base.toString()}`);
}

/** Listelenen tüm ürünleri (son 400) mevcut senkron ile Trendyol'a gönderir — tek tık. */
export async function sendAllProductsToTrendyolAction() {
  const admin = createAdminClient();
  const { data } = await admin.from("products").select("id").order("created_at", { ascending: false }).limit(400);
  const ids = (data ?? []).map((r) => String((r as { id: string }).id)).filter(Boolean);
  for (const id of ids) {
    await syncProductToTrendyol(admin, id);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect(
    `/admin/products?${new URLSearchParams({
      bulkOk: "trendyol_all",
      bulkCount: String(ids.length),
    }).toString()}`,
  );
}

export async function saveProduct(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const returnToRaw = String(formData.get("return_to") ?? "/admin").trim();
  const returnTo = returnToRaw.startsWith("/admin") ? returnToRaw : "/admin";
  const rawAttributes = String(formData.get("trendyol_category_attributes") ?? "").trim();
  let categoryAttributes: unknown = [];
  if (rawAttributes.length > 0) {
    try {
      categoryAttributes = JSON.parse(rawAttributes);
    } catch {
      redirect(
        `${returnTo}?productJsonError=invalid_json${id ? `&editProduct=${encodeURIComponent(id)}` : ""}#urun-formu`,
      );
    }
    if (categoryAttributes !== null && !Array.isArray(categoryAttributes)) {
      redirect(
        `${returnTo}?productJsonError=invalid_type${id ? `&editProduct=${encodeURIComponent(id)}` : ""}#urun-formu`,
      );
    }
  } else {
    categoryAttributes = [];
  }
  const existing = id
    ? await supabase
        .from("products")
        .select("id,price,stock_quantity,is_active,trendyol_active")
        .eq("id", id)
        .maybeSingle()
    : null;
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    short_description: String(formData.get("short_description") ?? ""),
    full_description: String(formData.get("full_description") ?? ""),
    price: Number(formData.get("price") ?? 0),
    compare_at_price: Number(formData.get("compare_at_price") ?? 0) || null,
    sku: String(formData.get("sku") ?? ""),
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    featured: formData.get("featured") === "on",
    new_arrival: formData.get("new_arrival") === "on",
    category_id: String(formData.get("category_id") ?? ""),
    collection_id: String(formData.get("collection_id") ?? "") || null,
    material: String(formData.get("material") ?? "") || null,
    color: String(formData.get("color") ?? "") || null,
    is_active: formData.get("is_active") === "on",
    trendyol_barcode: String(formData.get("trendyol_barcode") ?? "") || null,
    trendyol_stock_code: String(formData.get("trendyol_stock_code") ?? "") || null,
    trendyol_brand: ZELULA_TRENDYOL_BRAND_ID,
    trendyol_category_id: String(formData.get("trendyol_category_id") ?? "") || null,
    trendyol_category_attributes: categoryAttributes,
    trendyol_vat_rate: ZELULA_TRENDYOL_VAT_RATE,
    trendyol_list_price: Number(formData.get("trendyol_list_price") ?? 0) || null,
    trendyol_sale_price: Number(formData.get("trendyol_sale_price") ?? 0) || null,
    trendyol_quantity: Number(formData.get("trendyol_quantity") ?? 0) || null,
    trendyol_dimensional_weight: Number(formData.get("trendyol_dimensional_weight") ?? 0) || null,
    trendyol_active: formData.get("trendyol_active") === "on",
  };

  let productId = id;
  if (id) {
    await supabase.from("products").update(payload).eq("id", id);
  } else {
    const { data: inserted } = await supabase.from("products").insert(payload).select("id").maybeSingle();
    productId = inserted?.id ?? "";
  }
  if (productId) {
    await syncProductToTrendyol(supabase, productId);
    const prev = existing?.data;
    const priceChanged = prev ? Number(prev.price ?? 0) !== Number(payload.price ?? 0) : true;
    const stockChanged =
      prev ? Number(prev.stock_quantity ?? 0) !== Number(payload.stock_quantity ?? 0) : true;
    const activeChanged = prev ? Boolean(prev.is_active) !== Boolean(payload.is_active) : true;
    if (priceChanged || stockChanged || activeChanged) {
      await syncPriceInventoryForProducts(supabase, [productId], "save_product");
    }
  }
  revalidatePath("/admin");
  if (returnTo !== "/admin") revalidatePath(returnTo);
  if (!productId || returnTo === "/admin") return;

  if (id) {
    redirect(withQueryParam(returnTo, "productSaved", "1"));
  }
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(withQueryParam(`/admin/products/${encodeURIComponent(productId)}/edit`, "productSaved", "1"));
}

export async function saveTrendyolIntegrationSettings(formData: FormData) {
  const admin = createAdminClient();
  const payload = {
    marketplace: "trendyol",
    environment: String(formData.get("environment") ?? "stage") === "prod" ? "prod" : "stage",
    seller_id: String(formData.get("seller_id") ?? "") || null,
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    api_key: String(formData.get("api_key") ?? "") || null,
    api_secret: String(formData.get("api_secret") ?? "") || null,
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };
  await admin.from("marketplace_integrations").upsert(payload, { onConflict: "marketplace" });
  revalidatePath("/admin");
}

export async function syncTrendyolProductNow(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return;
  const admin = createAdminClient();
  await syncProductToTrendyol(admin, productId);
  revalidatePath("/admin");
}

export async function syncTrendyolPriceInventoryNow(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return;
  const admin = createAdminClient();
  await syncPriceInventoryForProducts(admin, [productId], "manual_button");
  revalidatePath("/admin");
}

function buildTrendyolPushOverridesFromForm(formData: FormData): TrendyolProductSyncOverrides {
  const o: TrendyolProductSyncOverrides = {};
  o.trendyol_brand = ZELULA_TRENDYOL_BRAND_ID;
  o.trendyol_vat_rate = ZELULA_TRENDYOL_VAT_RATE;
  const cid = String(formData.get("trendyol_category_id") ?? "").trim();
  if (cid) o.trendyol_category_id = cid;
  const barcode = String(formData.get("trendyol_barcode") ?? "").trim();
  if (barcode) o.trendyol_barcode = barcode;
  const stockCode = String(formData.get("trendyol_stock_code") ?? "").trim();
  if (stockCode) o.trendyol_stock_code = stockCode;
  const attrsRaw = String(formData.get("trendyol_category_attributes") ?? "").trim();
  if (attrsRaw) {
    try {
      o.trendyol_category_attributes = JSON.parse(attrsRaw);
    } catch {
      /* formda geçersiz JSON — yalnızca DB kullanılsın */
    }
  }
  const listP = String(formData.get("trendyol_list_price") ?? "").trim();
  if (listP !== "" && !Number.isNaN(Number(listP))) o.trendyol_list_price = Number(listP);
  const saleP = String(formData.get("trendyol_sale_price") ?? "").trim();
  if (saleP !== "" && !Number.isNaN(Number(saleP))) o.trendyol_sale_price = Number(saleP);
  const tq = String(formData.get("trendyol_quantity") ?? "").trim();
  if (tq !== "" && !Number.isNaN(Number(tq))) o.trendyol_quantity = Number(tq);
  const dw = String(formData.get("trendyol_dimensional_weight") ?? "").trim();
  if (dw !== "" && !Number.isNaN(Number(dw))) o.trendyol_dimensional_weight = Number(dw);
  return o;
}

/** Ürün düzenleme: ürün batch + fiyat/stok batch. Formdaki Trendyol alanları (varsa) bu gönderim için DB’nin üzerine yazılır — kaydetmeden deneme mümkün. */
export async function pushTrendyolProductAndInventoryFromForm(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) return;
  const admin = createAdminClient();
  const overrides = buildTrendyolPushOverridesFromForm(formData);
  const pr = await syncProductToTrendyol(admin, productId, {
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  });
  const ir = await syncPriceInventoryForProducts(admin, [productId], "product_form_push");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);

  const base = `/admin/products/${encodeURIComponent(productId)}/edit`;
  if (!pr.ok) {
    redirect(withQueryParam(base, "trendyolPushError", pr.message || "Ürün Trendyol’a gönderilemedi."));
  }
  if (!ir.ok) {
    const invTransient = "transient" in ir && ir.transient === true;
    const productActuallySent = pr.ok && !("skipped" in pr && pr.skipped);
    if (invTransient && productActuallySent) {
      redirect(
        withQueryParam(
          base,
          "trendyolPushInfo",
          "Ürün adımı Trendyol’a iletildi; fiyat/stok uç noktası geçici olarak yanıt vermedi (HTTP 556 vb.). Birkaç dakika sonra tekrar «Trendyol’a gönder» deneyin — ikinci adım yeniden dener.",
        ),
      );
    }
    redirect(withQueryParam(base, "trendyolPushError", ir.message || "Fiyat/stok Trendyol’a iletilemedi."));
  }
  const productSkipped = Boolean(pr.ok && "skipped" in pr && pr.skipped);
  const invSkipped = Boolean(ir.ok && "skipped" in ir && ir.skipped);
  if (productSkipped || invSkipped) {
    redirect(
      withQueryParam(
        base,
        "trendyolPushInfo",
        "İstek işlendi; ürün veya fiyat-stok adımı atlandı (sitede/Trendyol’da yayın kapalı olabilir veya entegrasyon eksik). Önce Kaydet, sonra tekrar deneyin veya admin loglarına bakın.",
      ),
    );
  }
  redirect(withQueryParam(base, "trendyolPushOk", "1"));
}

export async function syncTrendyolPriceInventoryBatch() {
  const admin = createAdminClient();
  const { data: ids } = await admin
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("trendyol_active", true)
    .limit(1000);
  await syncPriceInventoryForProducts(
    admin,
    (ids ?? []).map((x) => String(x.id)),
    "manual_batch",
  );
  revalidatePath("/admin");
}

export async function importTrendyolApprovedProductsAction(formData: FormData) {
  const admin = createAdminClient();
  const confirmed = formData.get("confirm_overwrite") === "on";
  await importApprovedProductsFromTrendyol(admin, !confirmed);
  revalidatePath("/admin");
}

export async function importTrendyolProductsAction() {
  const admin = createAdminClient();
  const result = await importApprovedProductsFromTrendyol(admin, false);
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  if (!result.ok) {
    const message = encodeURIComponent(
      normalizeTrendyolUiError(result.message ?? "İçe aktarma sırasında bir hata oluştu."),
    );
    redirect(`/admin?tab=analytics&trendyolImportError=${message}`);
  }
  redirect(
    `/admin?tab=analytics&trendyolImported=${result.imported}&trendyolUpdated=${result.updated ?? 0}&trendyolDeactivated=${result.deactivated ?? 0}&trendyolFetched=${result.fetchedCount ?? result.count ?? 0}`,
  );
}

export async function testTrendyolConnectionAction() {
  const admin = createAdminClient();
  const result = await testTrendyolProductsAccess(admin);
  revalidatePath("/admin");
  if (!result.ok) {
    const env = result.environment ? String(result.environment) : "";
    redirect(
      `/admin?tab=analytics&trendyolTestError=${encodeURIComponent(
        normalizeTrendyolUiError(result.message),
      )}&trendyolTestEnv=${encodeURIComponent(env)}`,
    );
  }
  redirect(
    `/admin?tab=analytics&trendyolTestOk=1&trendyolTestEnv=${encodeURIComponent(result.environment ?? "")}` +
      `&trendyolTestSellerId=${encodeURIComponent(result.sellerId ?? "")}` +
      `&trendyolTestEndpoint=${encodeURIComponent(result.endpoint ?? "")}` +
      `&trendyolApprovedCount=${encodeURIComponent(String(result.approvedCount ?? 0))}` +
      `&trendyolTotalCount=${encodeURIComponent(String(result.totalCount ?? 0))}`,
  );
}

export async function checkTrendyolBatchStatusAction(formData: FormData) {
  const batchRequestId = String(formData.get("batch_request_id") ?? "");
  if (!batchRequestId) return;
  const admin = createAdminClient();
  await checkTrendyolProductBatchStatus(admin, batchRequestId);
  revalidatePath("/admin");
}

export async function fetchTrendyolOrdersAction() {
  const admin = createAdminClient();
  const result = await fetchTrendyolOrdersForSync(admin);
  revalidatePath("/admin");
  revalidatePath("/admin/trendyol");
  if (!result.ok) {
    redirect(`/admin?tab=analytics&trendyolImportError=${encodeURIComponent(normalizeTrendyolUiError(result.message ?? "Sipariş çekim hatası"))}`);
  }
  redirect(
    `/admin?tab=analytics&trendyolOrdersProcessed=${result.processedOrders}&trendyolOrderStockUpdated=${result.updatedProducts}` +
      `&trendyolOrderUnmatched=${result.unmatchedProducts}&trendyolOrderDuplicate=${result.duplicateSkipped}&trendyolOrderRestored=${result.restoredOrders}`,
  );
}

export async function syncReadyTrendyolProductsAction() {
  const admin = createAdminClient();
  const { data: integrationRow } = await admin
    .from("marketplace_integrations")
    .select("id")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  const integrationId = integrationRow?.id as string | undefined;
  const { data: products } = await admin
    .from("products")
    .select(
      "id,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,sku,trendyol_brand,trendyol_category_id,trendyol_sale_price,price,trendyol_quantity,stock_quantity,trendyol_vat_rate,trendyol_category_attributes,product_images(image_url)",
    )
    .limit(1000);
  const catIds = [
    ...new Set(
      (products ?? [])
        .map((p) => String(p.trendyol_category_id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  let caches: { category_id: string; payload: unknown; fetched_at: string }[] = [];
  if (integrationId && catIds.length > 0) {
    const { data } = await admin
      .from("marketplace_category_attribute_cache")
      .select("category_id,payload,fetched_at")
      .eq("integration_id", integrationId)
      .in("category_id", catIds);
    caches = data ?? [];
  }
  const cacheByCategory = new Map(caches.map((c) => [c.category_id, c]));
  const readyIds = (products ?? [])
    .filter((p) => {
      const catId = String(p.trendyol_category_id ?? "").trim();
      const cacheRow = catId ? cacheByCategory.get(catId) : undefined;
      const categoryCtx = buildCategoryReadinessFromCache(
        cacheRow
          ? {
              category_id: cacheRow.category_id,
              payload: cacheRow.payload,
              fetched_at: String(cacheRow.fetched_at),
            }
          : undefined,
        p.trendyol_category_attributes,
      );
      return (
        evaluateTrendyolReadiness(
          {
            is_active: Boolean(p.is_active),
            trendyol_active: Boolean(p.trendyol_active),
            trendyol_barcode: p.trendyol_barcode,
            trendyol_stock_code: p.trendyol_stock_code,
            sku: p.sku,
            trendyol_brand: p.trendyol_brand,
            trendyol_category_id: p.trendyol_category_id,
            trendyol_sale_price: Number(p.trendyol_sale_price ?? (p as { price?: number }).price ?? 0),
            trendyol_quantity: Number(p.trendyol_quantity ?? p.stock_quantity ?? 0),
            stock_quantity: Number(p.stock_quantity ?? 0),
            trendyol_vat_rate: Number(p.trendyol_vat_rate ?? 0),
            trendyol_https_image_count: countTrendyolHttpsProductImages(
              (p as { product_images?: { image_url?: string | null }[] | null }).product_images,
            ),
          },
          categoryCtx,
        ).status === "ready"
      );
    })
    .map((p) => p.id);
  for (const pid of readyIds) {
    await syncProductToTrendyol(admin, pid);
  }
  revalidatePath("/admin");
}

export async function refreshTrendyolCategoryAttributesAction(formData: FormData) {
  const admin = createAdminClient();
  const productId = String(formData.get("product_id") ?? "").trim();
  const categoryIdInput = String(formData.get("category_id") ?? "").trim();
  let categoryId = categoryIdInput;
  if (productId) {
    const { data: row } = await admin
      .from("products")
      .select("trendyol_category_id")
      .eq("id", productId)
      .maybeSingle();
    categoryId = String(row?.trendyol_category_id ?? "").trim();
  }
  if (categoryId) {
    await fetchTrendyolCategoryAttributesCached(admin, categoryId, { forceRefresh: true });
  }
  revalidatePath("/admin");
}

const TRENDYOL_PAYLOAD_PREVIEW_SELECT =
  "id,name,sku,stock_quantity,price,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_brand,trendyol_category_id,trendyol_category_attributes,trendyol_vat_rate,trendyol_list_price,trendyol_sale_price,trendyol_quantity,trendyol_dimensional_weight";

/** Dry-run: same JSON as product sync POST body. No Trendyol API calls or DB writes. */
export async function getTrendyolProductPayloadPreviewAction(productId: string) {
  const id = String(productId ?? "").trim();
  if (!id) return { ok: false as const, message: "Ürün seçilmedi." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(TRENDYOL_PAYLOAD_PREVIEW_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, message: "Ürün bulunamadı." };
  }

  const product = data as TrendyolProductPayloadInput;
  const payload = buildTrendyolProductPayload(product);
  const issues = analyzeTrendyolProductPayloadIssues(payload);
  return { ok: true as const, payload, issues };
}

export async function searchTrendyolCategoriesAction(query: string) {
  const q = String(query ?? "").trim();
  if (q.length < 2) return { ok: true as const, results: [] as TrendyolCategoryLeaf[] };

  const admin = createAdminClient();
  const tree = await fetchTrendyolCategoryTreeCached(admin);
  if (!tree.ok) {
    return { ok: false as const, message: tree.message, results: [] as TrendyolCategoryLeaf[] };
  }
  const results = searchTrendyolCategoryLeaves(tree.leaves, q, 25);
  return { ok: true as const, results };
}

export async function searchTrendyolBrandsByNameAction(
  name: string,
): Promise<{ ok: true; brands: TrendyolBrandHit[] } | { ok: false; message: string; brands: TrendyolBrandHit[] }> {
  const admin = createAdminClient();
  const result = await fetchTrendyolBrandsByName(admin, name);
  if (!result.ok) {
    return { ok: false, message: normalizeTrendyolUiError(result.message), brands: [] };
  }
  return { ok: true, brands: result.brands };
}

/** Warm attribute cache after picking a category in the product form (no product sync). */
export async function prefetchTrendyolCategoryAttributesForFormAction(categoryId: string) {
  const id = String(categoryId ?? "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await fetchTrendyolCategoryAttributesCached(admin, id, { forceRefresh: false });
}

/** Ürün formu: kategori ID ile Trendyol özellik şemasını çekip personel için seçim listesi üretir. */
export async function loadTrendyolCategoryAttributePickerRowsAction(categoryId: string): Promise<
  | { ok: true; rows: TrendyolCategoryAttributePickerRow[] }
  | { ok: false; message: string; rows: TrendyolCategoryAttributePickerRow[] }
> {
  const id = String(categoryId ?? "").trim();
  if (!/^\d+$/.test(id)) {
    return { ok: false, message: "Önce geçerli bir Trendyol kategori ID girin (yalnızca rakam).", rows: [] };
  }
  const admin = createAdminClient();
  const res = await fetchTrendyolCategoryAttributesCached(admin, id, { forceRefresh: false });
  if (!res.ok) {
    return { ok: false, message: normalizeTrendyolUiError(res.message), rows: [] };
  }
  return { ok: true, rows: extractCategoryAttributesForPicker(res.payload) };
}

export async function saveCategory(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    image_url: String(formData.get("image_url") ?? "").trim() || null,
  };
  if (id) await supabase.from("categories").update(payload).eq("id", id);
  else await supabase.from("categories").insert(payload);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveCollection(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    image_url: String(formData.get("image_url") ?? "").trim() || null,
  };
  if (id) await supabase.from("collections").update(payload).eq("id", id);
  else await supabase.from("collections").insert(payload);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const order_status = String(formData.get("order_status") ?? "pending");
  const payment_status = String(formData.get("payment_status") ?? "pending");
  await supabase
    .from("orders")
    .update({ order_status, payment_status, updated_at: new Date().toISOString() })
    .eq("id", id);
  await syncLoyaltyLedgersForOrder(supabase, id);
  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: "manual",
    event_type: "manual_status_update",
    status: "updated",
    request_payload: { order_status, payment_status },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });
  revalidateAdminOrderPaths(id);
}

export async function markOrderHandDelivered(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const paymentStatus = String(formData.get("payment_status") ?? "pending");
  if (!id) return;

  await supabase
    .from("orders")
    .update({
      order_status: "hand_delivered",
      payment_status: paymentStatus,
      shipping_provider: "manual",
      shipping_status: "hand_delivered",
      shipping_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: "manual",
    event_type: "manual_hand_delivery",
    status: "updated",
    request_payload: { order_status: "hand_delivered", shipping_status: "hand_delivered" },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidateAdminOrderPaths(id);
}

const PRODUCT_IMAGES_BUCKET = "product-images";

function safeReturnToForImageActions(raw: string, productId: string): string {
  const t = String(raw ?? "").trim();
  if (t.startsWith("/admin")) return t;
  const id = String(productId ?? "").trim();
  if (!id) return "/admin/products";
  return `/admin/products/${encodeURIComponent(id)}/edit`;
}

function withQueryParam(path: string, key: string, value: string): string {
  const [base, qs] = path.split("?");
  const params = new URLSearchParams(qs ?? "");
  params.set(key, value);
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

function storageObjectPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  const path = publicUrl.slice(i + marker.length).split("?")[0]?.split("#")[0];
  return path && path.length > 0 ? path : null;
}

export async function uploadProductImage(formData: FormData) {
  const supabase = createAdminClient();
  const productId = String(formData.get("product_id") ?? "");
  const file = formData.get("image") as File | null;
  const returnTo = safeReturnToForImageActions(String(formData.get("return_to") ?? ""), productId);

  if (!productId || !file || file.size === 0) {
    redirect(withQueryParam(returnTo, "imageUploadError", "Ürün veya dosya bulunamadı."));
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `products/${productId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) {
    redirect(
      withQueryParam(
        returnTo,
        "imageUploadError",
        uploadError.message || "Depolama yüklemesi başarısız (kota, izin veya dosya boyutu).",
      ),
    );
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  const { data: existingRows } = await supabase
    .from("product_images")
    .select("sort_order,is_cover")
    .eq("product_id", productId);
  const existing = existingRows ?? [];
  const maxSort = existing.reduce((m, r) => Math.max(m, Number(r.sort_order ?? 0)), 0);
  const needsCover = existing.length === 0 || !existing.some((r) => r.is_cover);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    image_url: data.publicUrl,
    is_cover: needsCover,
    sort_order: maxSort + 1,
  });
  if (insertError) {
    redirect(withQueryParam(returnTo, "imageUploadError", insertError.message || "Veritabanına kayıt eklenemedi."));
  }

  revalidatePath("/admin");
  revalidatePath("/urunler");
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(withQueryParam(returnTo, "imageUploadOk", "1"));
}

export async function deleteProductImage(formData: FormData) {
  const supabase = createAdminClient();
  const productId = String(formData.get("product_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  const returnTo = safeReturnToForImageActions(String(formData.get("return_to") ?? ""), productId);

  if (!productId || !imageId) {
    redirect(withQueryParam(returnTo, "imageUploadError", "Geçersiz silme isteği."));
  }

  const { data: row, error: fetchError } = await supabase
    .from("product_images")
    .select("id,product_id,image_url")
    .eq("id", imageId)
    .maybeSingle();
  if (fetchError || !row || String(row.product_id) !== productId) {
    redirect(withQueryParam(returnTo, "imageUploadError", "Görsel bulunamadı veya bu ürüne ait değil."));
  }

  const { error: delError } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
  if (delError) {
    redirect(withQueryParam(returnTo, "imageUploadError", delError.message || "Görsel kaydı silinemedi."));
  }

  const url = String(row.image_url ?? "");
  const objectPath = storageObjectPathFromPublicUrl(url, PRODUCT_IMAGES_BUCKET);
  if (objectPath) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
  }

  revalidatePath("/admin");
  revalidatePath("/urunler");
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(withQueryParam(returnTo, "imageDeleted", "1"));
}

export async function retryPaymentInit(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: order } = await supabase
    .from("orders")
    .select("id,payment_status,order_status,payment_provider")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.payment_status === "paid") return;

  await supabase
    .from("orders")
    .update({ payment_status: "pending", order_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: order.payment_provider ?? "paytr",
    event_type: "manual_retry_init",
    status: "queued",
    request_payload: { action: "retry_payment_init" },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidateAdminOrderPaths(id);
}

export async function reconcileOrderStatus(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [{ data: order }, { data: logs }] = await Promise.all([
    supabase.from("orders").select("id,payment_status,order_status,payment_provider").eq("id", id).maybeSingle(),
    supabase
      .from("payment_logs")
      .select("status,callback_hash,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!order) return;

  const hasSuccess = (logs ?? []).some((l) => l.status === "success");
  const nextPaymentStatus = hasSuccess ? "paid" : order.payment_status;
  const isCancelled = String(order.order_status ?? "") === "cancelled";
  const nextOrderStatus = isCancelled ? "cancelled" : hasSuccess ? "confirmed" : String(order.order_status ?? "pending");

  if (!(order.payment_status === "paid" && !hasSuccess)) {
    await supabase
      .from("orders")
      .update({
        payment_status: nextPaymentStatus,
        order_status: nextOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  await syncLoyaltyLedgersForOrder(supabase, id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: order.payment_provider ?? "paytr",
    event_type: "manual_reconcile",
    status: hasSuccess ? "resolved_paid" : "checked_no_success",
    response_payload: { checked_logs: logs?.length ?? 0, hasSuccess },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidateAdminOrderPaths(id);
}

export async function markOrderPaidManually(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== "ONAYLIYORUM") return;

  const { data: order } = await supabase
    .from("orders")
    .select("id,payment_status,payment_provider,order_number")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.payment_status === "paid") return;

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      order_status: "confirmed",
      payment_reference: order.order_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: "manual",
    event_type: "manual_mark_paid",
    status: "paid_override",
    request_payload: { confirm },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  await syncLoyaltyLedgersForOrder(supabase, id);

  revalidateAdminOrderPaths(id);
}
