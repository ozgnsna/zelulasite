/**
 * Zelula409 — üst göz + çift nazarlı kalp üç katmanlı altın sallantılı küpe (çift)
 *   node scripts/import-zelula409-heart-eye-drop-kupe.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "product-images";
const ASSETS_DIR = path.resolve(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-ozgun-zelulasite/assets",
);

const DRY_RUN = process.argv.includes("--dry-run");
const SKU = "Zelula409";
const SITE_PRICE = 899;
const TY_PRICE = 999;
const COST_PRICE = 350;
const STOCK = 1;
const BRAND_ID = "2489862";
const CATEGORY_ID = "3417";
const VAT_RATE = 20;

const TRENDYOL_ATTRIBUTES = [
  { attributeId: 433, attributeValueId: 1195128 },
  { attributeId: 1192, attributeValueId: 10617300 },
  { attributeId: 348, attributeValueId: 6996 },
  { attributeId: 1204, attributeValueId: 10621740 },
  { attributeId: 260, attributeValueId: 2475 },
  { attributeId: 343, attributeValueId: 4296 },
  { attributeId: 14, attributeValueId: 688 },
  { attributeId: 346, attributeValueId: 4292 },
  { attributeId: 32, attributeValueId: 870 },
  { attributeId: 47, customAttributeValue: "Gold" },
];

const PRODUCT = {
  slug: "sacred-heart-gaze-nazar-kalp-zirkon-altin-celik-sallantili-kupe",
  name: "Sacred Heart Gaze Nazar Detaylı Üçlü Kalp Zirkon Altın Kaplama Çelik Sallantılı Küpe",
  color: "Altın / Siyah-Beyaz",
  material: "Paslanmaz Çelik",
  short:
    "Pavé zirkon göz stud, ortada ve altta nazar detaylı çift kalp formlu üç katmanlı sallantı. Altın renk 316L çelik küpe çifti — mistik ve romantik statement parça.",
  full: `Stud üstte siyah-beyaz pavé zirkon taşlarla kaplı göz formu; altın kaplama halkalarla bağlanan iki kalp katmanında merkezde nazar boncuğu silueti, çevresinde parlak zirkon taşlarla tamamlanır. Üç kademeli sallantı gündüzden geceye hem sembolik hem ışıltılı bir duruş sunar.

316L paslanmaz çelik altın renk gövde hipoalerjeniktir; klipsli stud oturumu kulakta dengeli durur. Tek renk kombinlerde bile dikkat çeken, nazar ve kalp motiflerini bir araya getiren özel bir küpe çiftidir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın kaplama görünüm)
• Taş: Parlak zirkon + siyah pavé detay
• Tip: Üç katmanlı sallantılı küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
  images: [
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_24_Tem_2026_17_27_44-40acf2d6-e054-4de8-8116-2d1cc6ca987f.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_24_Tem_2026_17_39_14-0c729e56-0040-4e08-a858-c3f25022017d.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_24_Tem_2026_17_49_23-3b46a7f8-c0cc-4d54-ba20-961be82ced0c.png",
  ],
};

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

function trim(v) {
  return String(v ?? "").trim();
}

async function uploadImages(admin, productId, imageFiles) {
  const urls = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const bytes = fs.readFileSync(imageFiles[i]);
    const storagePath = `products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const { error: insertError } = await admin.from("product_images").insert({
      product_id: productId,
      image_url: data.publicUrl,
      is_cover: i === 0,
      sort_order: i,
    });
    if (insertError) throw new Error(insertError.message);
    urls.push(data.publicUrl);
  }
  return urls;
}

function tyHeaders(integration) {
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
  };
}

async function pushTrendyol(integration, admin, product, imageUrls) {
  const barcode = trim(product.trendyol_barcode) || trim(product.sku);
  const stockCode = trim(product.trendyol_stock_code) || trim(product.sku);
  const payload = {
    items: [
      {
        barcode,
        title: product.name,
        productMainId: stockCode,
        brandId: Number(BRAND_ID),
        categoryId: Number(CATEGORY_ID),
        quantity: STOCK,
        stockCode,
        dimensionalWeight: 1,
        description: product.full_description,
        currencyType: "TRY",
        listPrice: TY_PRICE,
        salePrice: TY_PRICE,
        vatRate: VAT_RATE,
        images: imageUrls.slice(0, 8).map((url) => ({ url })),
        attributes: TRENDYOL_ATTRIBUTES,
      },
    ],
  };

  const sellerId = encodeURIComponent(integration.seller_id);
  const res = await fetch(
    `https://apigw.trendyol.com/integration/product/sellers/${sellerId}/v2/products`,
    { method: "POST", headers: tyHeaders(integration), body: JSON.stringify(payload) },
  );
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 400) };
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

  return { ok: res.ok, httpStatus: res.status, batchRequestId, body };
}

async function run() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const imagePaths = PRODUCT.images.map((f) => path.join(ASSETS_DIR, f));
  for (const p of imagePaths) {
    if (!fs.existsSync(p)) throw new Error(`Görsel yok: ${p}`);
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: category } = await admin.from("categories").select("id").eq("slug", "kupe").maybeSingle();
  if (!category?.id) throw new Error("Küpe kategorisi bulunamadı");

  const { data: dup } = await admin.from("products").select("id").eq("sku", SKU).maybeSingle();
  if (dup?.id) throw new Error(`${SKU} zaten mevcut`);

  const payload = {
    name: PRODUCT.name,
    slug: PRODUCT.slug,
    short_description: PRODUCT.short,
    full_description: PRODUCT.full,
    price: SITE_PRICE,
    compare_at_price: TY_PRICE,
    cost_price: COST_PRICE,
    sku: SKU,
    stock_quantity: STOCK,
    featured: false,
    new_arrival: true,
    category_id: category.id,
    target_audience: "kadin",
    material: PRODUCT.material,
    color: PRODUCT.color,
    is_active: true,
    trendyol_barcode: SKU,
    trendyol_stock_code: SKU,
    trendyol_active: true,
    trendyol_brand: BRAND_ID,
    trendyol_category_id: CATEGORY_ID,
    trendyol_category_attributes: TRENDYOL_ATTRIBUTES,
    trendyol_sale_price: TY_PRICE,
    trendyol_list_price: TY_PRICE,
    trendyol_vat_rate: VAT_RATE,
    trendyol_dimensional_weight: 1,
    trendyol_quantity: STOCK,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku: SKU, payload, images: imagePaths.length }, null, 2));
    return;
  }

  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert(payload)
    .select("id,sku,slug,name")
    .maybeSingle();
  if (insertError || !inserted?.id) throw new Error(insertError?.message ?? "insert failed");

  const imageUrls = await uploadImages(admin, inserted.id, imagePaths);
  console.log(`✓ DB: ${inserted.sku} — ${inserted.name}`);
  console.log(`  https://www.zeluladesign.com/urunler/${inserted.slug}`);
  console.log(`  site ${SITE_PRICE}₺ · TY ${TY_PRICE}₺ · alış ${COST_PRICE}₺+KDV · stok ${STOCK}`);

  const { data: integration } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls);
    console.log(`${ty.ok ? "✓" : "✗"} Trendyol HTTP ${ty.httpStatus} — batch: ${ty.batchRequestId ?? "yok"}`);
    if (!ty.ok) {
      console.log(JSON.stringify(ty.body, null, 2));
      process.exit(1);
    }
  }

  console.log(JSON.stringify({ ok: true, sku: SKU, slug: PRODUCT.slug, images: imageUrls.length }, null, 2));
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
