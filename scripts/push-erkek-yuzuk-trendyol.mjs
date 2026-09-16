/**
 * Zelula362–374 erkek yüzüklerini Trendyol'a gönderir.
 *   node scripts/push-erkek-yuzuk-trendyol.mjs
 *   node scripts/push-erkek-yuzuk-trendyol.mjs --dry-run
 *   node scripts/push-erkek-yuzuk-trendyol.mjs --sku Zelula362
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const SKU_FILTER = process.argv.find((a) => a.startsWith("--sku="))?.slice("--sku=".length) ?? null;
const DELAY_MS = 2500;

const BRAND_ID = "2489862";
const CATEGORY_ID = "2841";
const VAT_RATE = 20;
const SALE_PRICE = 999;
const RING_SIZE_ATTR = 338;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function trim(v) {
  return String(v ?? "").trim();
}

function resolveWebColorId(color) {
  const c = trim(color).toLocaleLowerCase("tr-TR");
  if (!c || c === "gümüş") return 7000;
  if (c.includes("/") || c.includes("çok")) return 686230;
  if (c.includes("siyah")) return 7009;
  if (c.includes("altın")) return 6996;
  if (c.includes("gümüş")) return 7000;
  return 686230;
}

function baseAttributes(color) {
  return [
    { attributeId: 348, attributeValueId: resolveWebColorId(color) },
    { attributeId: 343, attributeValueId: 4294 },
    { attributeId: RING_SIZE_ATTR, attributeValueId: 7022 },
    { attributeId: 47, customAttributeValue: trim(color) || "Gümüş" },
    { attributeId: 1192, attributeValueId: 10617300 },
    { attributeId: 14, attributeValueId: 688 },
  ];
}

function withRingSize(attributes, sizeLabel) {
  const list = attributes.map((x) => ({ ...x }));
  const size = trim(sizeLabel);
  if (!size) return list;
  const idx = list.findIndex((row) => Number(row.attributeId) === RING_SIZE_ATTR);
  const next = { attributeId: RING_SIZE_ATTR, customAttributeValue: size };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.push(next);
  return list;
}

function buildVariantBarcode(base, size) {
  const s = trim(size).replace(/\s+/g, "").replace(/[^a-zA-Z0-9._-]/g, "");
  return s ? `${trim(base)}-${s}` : trim(base);
}

function buildImages(rows) {
  const sorted = [...(rows ?? [])].sort((a, b) => {
    if (Boolean(a.is_cover) !== Boolean(b.is_cover)) return a.is_cover ? -1 : 1;
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
  return sorted
    .map((r) => trim(r.image_url))
    .filter((u) => /^https:\/\//i.test(u))
    .slice(0, 8)
    .map((url) => ({ url }));
}

function buildPayloadItems(product, variants) {
  const mainId = trim(product.trendyol_stock_code) || trim(product.trendyol_barcode) || trim(product.sku);
  const baseBarcode = trim(product.trendyol_barcode) || trim(product.trendyol_stock_code) || trim(product.sku);
  const salePrice = Number(product.trendyol_sale_price ?? 0);
  const listPrice = Number(product.trendyol_list_price ?? product.trendyol_sale_price ?? 0);
  const images = buildImages(product.product_images);
  const attrs = Array.isArray(product.trendyol_category_attributes)
    ? product.trendyol_category_attributes
    : baseAttributes(product.color);

  const activeVariants = (variants ?? []).filter(
    (v) => v.is_active !== false && trim(v.label).length > 0,
  );

  if (activeVariants.length === 0) {
    return [
      {
        barcode: baseBarcode,
        title: product.name,
        productMainId: mainId,
        brandId: Number(BRAND_ID),
        categoryId: Number(CATEGORY_ID),
        quantity: Math.max(0, Math.floor(Number(product.stock_quantity ?? 0))),
        stockCode: mainId,
        dimensionalWeight: Number(product.trendyol_dimensional_weight ?? 1),
        description: product.name,
        currencyType: "TRY",
        listPrice,
        salePrice,
        vatRate: Number(product.trendyol_vat_rate ?? VAT_RATE),
        images,
        attributes: attrs,
      },
    ];
  }

  return activeVariants.map((v) => {
    const size = trim(v.label);
    const barcode = buildVariantBarcode(baseBarcode, size);
    return {
      barcode,
      title: product.name,
      productMainId: mainId,
      brandId: Number(BRAND_ID),
      categoryId: Number(CATEGORY_ID),
      quantity: Math.max(0, Math.floor(Number(v.stock_quantity ?? 0))),
      stockCode: `${mainId}-${size}`,
      dimensionalWeight: Number(product.trendyol_dimensional_weight ?? 1),
      description: product.name,
      currencyType: "TRY",
      listPrice,
      salePrice,
      vatRate: Number(product.trendyol_vat_rate ?? VAT_RATE),
      images,
      attributes: withRingSize(attrs, size),
    };
  });
}

function tyBase(integration) {
  return integration.environment === "prod" ? "https://apigw.trendyol.com" : "https://stageapigw.trendyol.com";
}

function tyHeaders(integration) {
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Self Integration`,
  };
}

async function pushProduct(integration, product, variants) {
  const payload = { items: buildPayloadItems(product, variants) };
  const sellerId = encodeURIComponent(integration.seller_id);
  const url = `${tyBase(integration)}/integration/product/sellers/${sellerId}/v2/products`;
  const res = await fetch(url, {
    method: "POST",
    headers: tyHeaders(integration),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, httpStatus: res.status, body, payload, variantCount: payload.items.length };
}

async function checkBatch(integration, batchId) {
  const sellerId = encodeURIComponent(integration.seller_id);
  const url = `${tyBase(integration)}/integration/product/sellers/${sellerId}/products/batch-requests/${encodeURIComponent(batchId)}`;
  const res = await fetch(url, { headers: tyHeaders(integration) });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: integration, error: intErr } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();

if (intErr || !integration?.is_active || !integration.api_key || !integration.api_secret) {
  console.error("Trendyol entegrasyonu yok veya pasif.");
  process.exit(1);
}

let query = admin
  .from("products")
  .select(
    "id,sku,name,color,stock_quantity,price,is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_brand,trendyol_category_id,trendyol_category_attributes,trendyol_vat_rate,trendyol_list_price,trendyol_sale_price,trendyol_dimensional_weight,product_images(image_url,is_cover,sort_order)",
  )
  .gte("sku", "Zelula362")
  .lte("sku", "Zelula374")
  .order("sku");

if (SKU_FILTER) query = query.eq("sku", SKU_FILTER);

const { data: products, error: prodErr } = await query;
if (prodErr) {
  console.error(prodErr.message);
  process.exit(1);
}
if (!products?.length) {
  console.error("Gönderilecek ürün bulunamadı.");
  process.exit(1);
}

const ids = products.map((p) => p.id);
const { data: variants } = await admin
  .from("product_variants")
  .select("product_id,label,stock_quantity,is_active")
  .in("product_id", ids)
  .order("sort_order");

const variantsByProduct = new Map();
for (const v of variants ?? []) {
  const list = variantsByProduct.get(v.product_id) ?? [];
  list.push(v);
  variantsByProduct.set(v.product_id, list);
}

const updates = products.map((p) => ({
  id: p.id,
  trendyol_active: true,
  trendyol_brand: BRAND_ID,
  trendyol_category_id: CATEGORY_ID,
  trendyol_category_attributes: baseAttributes(p.color),
  trendyol_sale_price: SALE_PRICE,
  trendyol_list_price: SALE_PRICE,
  trendyol_vat_rate: VAT_RATE,
  trendyol_dimensional_weight: 1,
  trendyol_barcode: trim(p.trendyol_barcode) || trim(p.sku),
  trendyol_stock_code: trim(p.trendyol_stock_code) || trim(p.sku),
}));

console.log(`Hedef: ${products.length} ürün (${products.map((p) => p.sku).join(", ")})`);

if (DRY_RUN) {
  for (const p of products) {
    const merged = {
      ...p,
      ...updates.find((u) => u.id === p.id),
      trendyol_category_attributes: baseAttributes(p.color),
    };
    const items = buildPayloadItems(merged, variantsByProduct.get(p.id) ?? []);
    console.log(`\n${p.sku}: ${items.length} TY satırı`);
    console.log(JSON.stringify(items, null, 2));
  }
  process.exit(0);
}

for (const u of updates) {
  const { error } = await admin
    .from("products")
    .update({
      trendyol_active: u.trendyol_active,
      trendyol_brand: u.trendyol_brand,
      trendyol_category_id: u.trendyol_category_id,
      trendyol_category_attributes: u.trendyol_category_attributes,
      trendyol_sale_price: u.trendyol_sale_price,
      trendyol_list_price: u.trendyol_list_price,
      trendyol_vat_rate: u.trendyol_vat_rate,
      trendyol_dimensional_weight: u.trendyol_dimensional_weight,
      trendyol_barcode: u.trendyol_barcode,
      trendyol_stock_code: u.trendyol_stock_code,
    })
    .eq("id", u.id);
  if (error) {
    console.error(`${u.id} güncellenemedi: ${error.message}`);
    process.exit(1);
  }
}
console.log("Trendyol alanları güncellendi.\n");

const results = [];
for (let i = 0; i < products.length; i += 1) {
  const p = products[i];
  const merged = {
    ...p,
    ...updates.find((u) => u.id === p.id),
    trendyol_category_attributes: baseAttributes(p.color),
  };
  const pVariants = variantsByProduct.get(p.id) ?? [];

  if (buildImages(merged.product_images).length === 0) {
    results.push({ sku: p.sku, ok: false, message: "https görsel yok" });
    console.log(`✗ ${p.sku} — https görsel yok`);
    continue;
  }

  const push = await pushProduct(integration, merged, pVariants);
  const batchRequestId = push.body?.batchRequestId ?? null;
  const message = push.ok
    ? `Product batch sent (${push.variantCount} ölçü/varyant satırı).`
    : `Trendyol HTTP ${push.httpStatus} — ${JSON.stringify(push.body).slice(0, 300)}`;

  await admin.from("marketplace_product_links").upsert(
    {
      integration_id: integration.id,
      marketplace: "trendyol",
      product_id: p.id,
      barcode: merged.trendyol_barcode,
      stock_code: merged.trendyol_stock_code,
      batch_request_id: batchRequestId,
      status: push.ok ? "pending" : "failed",
      last_error: push.ok ? null : message,
      last_payload: push.payload,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_id,product_id" },
  );

  await admin.from("marketplace_sync_logs").insert({
    integration_id: integration.id,
    marketplace: "trendyol",
    entity_type: "product",
    entity_id: p.id,
    action: "product_sync",
    status: push.ok ? "pending" : "error",
    message,
    batch_request_id: batchRequestId,
    request_payload: push.payload,
    response_payload: push.body,
  });

  results.push({
    sku: p.sku,
    ok: push.ok,
    httpStatus: push.httpStatus,
    batchRequestId,
    variantCount: push.variantCount,
    message,
  });

  console.log(`${push.ok ? "✓" : "✗"} ${p.sku} — HTTP ${push.httpStatus} — ${push.variantCount} satır — batch: ${batchRequestId ?? "yok"}`);
  if (!push.ok) console.log(`  ${message}`);

  if (i < products.length - 1) await sleep(DELAY_MS);
}

const okBatches = results.filter((r) => r.batchRequestId).map((r) => r.batchRequestId);
if (okBatches.length > 0) {
  console.log("\nBatch durumları kontrol ediliyor (5 sn bekleniyor)...");
  await sleep(5000);
  for (const r of results.filter((x) => x.batchRequestId)) {
    const status = await checkBatch(integration, r.batchRequestId);
    const items = Array.isArray(status.items) ? status.items : [];
    const failed = items.filter((it) => String(it.status ?? "").toUpperCase() === "FAILED");
    const success = items.filter((it) => String(it.status ?? "").toUpperCase() === "SUCCESS");
    console.log(
      `${r.sku}: batch=${r.batchRequestId} apiStatus=${status.status ?? "?"} success=${success.length} failed=${failed.length}`,
    );
    if (failed[0]?.failureReasons?.length) {
      console.log(`  örnek hata: ${JSON.stringify(failed[0].failureReasons).slice(0, 250)}`);
    }
  }
}

const ok = results.filter((r) => r.ok).length;
const fail = results.length - ok;
console.log(`\nÖzet: ${ok} gönderildi, ${fail} hata, toplam ${results.length} ürün`);
console.log(JSON.stringify(results, null, 2));
