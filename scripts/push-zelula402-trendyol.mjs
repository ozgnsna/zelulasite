/**
 * Zelula402 — Trendyol açıklama + ürün bilgisi güncelleme
 *   node scripts/push-zelula402-trendyol.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKU = "Zelula402";

function loadEnvFile(f) {
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: product, error: pErr } = await admin
  .from("products")
  .select(
    "id,sku,name,full_description,stock_quantity,trendyol_barcode,trendyol_stock_code,trendyol_brand,trendyol_category_id,trendyol_category_attributes,trendyol_vat_rate,trendyol_list_price,trendyol_sale_price,product_images(image_url,is_cover,sort_order)",
  )
  .eq("sku", SKU)
  .maybeSingle();
if (pErr || !product?.id) throw new Error(`Ürün yok: ${SKU}`);

const images = [...(product.product_images ?? [])]
  .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
  .map((x) => String(x.image_url ?? "").trim())
  .filter(Boolean);
if (images.length === 0) throw new Error("Görsel yok");

const { data: integration } = await admin
  .from("marketplace_integrations")
  .select("id,environment,seller_id,api_key,api_secret,is_active")
  .eq("marketplace", "trendyol")
  .maybeSingle();
if (!integration?.is_active) throw new Error("Trendyol entegrasyonu kapalı");

const barcode = String(product.trendyol_barcode || product.sku).trim();
const stockCode = String(product.trendyol_stock_code || product.sku).trim();
const salePrice = Number(product.trendyol_sale_price ?? 549);
const listPrice = Number(product.trendyol_list_price ?? salePrice);

const payload = {
  items: [
    {
      barcode,
      title: product.name,
      productMainId: stockCode,
      brandId: Number(product.trendyol_brand),
      categoryId: Number(product.trendyol_category_id),
      quantity: Math.max(0, Number(product.stock_quantity ?? 1)),
      stockCode,
      dimensionalWeight: 1,
      description: product.full_description,
      currencyType: "TRY",
      listPrice,
      salePrice,
      vatRate: Number(product.trendyol_vat_rate ?? 20),
      images: images.slice(0, 8).map((url) => ({ url })),
      attributes: product.trendyol_category_attributes ?? [],
    },
  ],
};

const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
const sellerId = encodeURIComponent(integration.seller_id);
const url = `https://apigw.trendyol.com/integration/product/sellers/${sellerId}/v2/products`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
let body = null;
try {
  body = text ? JSON.parse(text) : null;
} catch {
  body = { raw: text.slice(0, 500) };
}

const batchRequestId = body?.batchRequestId ?? null;
await admin.from("marketplace_product_links").upsert(
  {
    integration_id: integration.id,
    marketplace: "trendyol",
    product_id: product.id,
    barcode,
    stock_code: stockCode,
    batch_request_id: batchRequestId,
    status: res.ok ? "pending" : "failed",
    last_error: res.ok ? null : `HTTP ${res.status}`,
    last_payload: payload,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { onConflict: "integration_id,product_id" },
);

console.log(`${res.ok ? "✓" : "✗"} Trendyol HTTP ${res.status} — ${SKU}`);
console.log(`batch: ${batchRequestId ?? "yok"}`);
if (!res.ok) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(1);
}
