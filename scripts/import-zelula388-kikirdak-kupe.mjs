/**
 * Zelula388 — zirkon taşlı kıkırdak küpe (ear cuff)
 *   node scripts/import-zelula388-kikirdak-kupe.mjs
 *   node scripts/import-zelula388-kikirdak-kupe.mjs --dry-run
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
const SKU = "Zelula388";
const SITE_PRICE = 799;
const TY_PRICE = 899;
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
  slug: "soleil-flora-zirkon-kikirdak-kupe",
  name: "Soleil Flora Zirkon Taşlı Altın Kaplama Çelik Kıkırdak Küpe",
  color: "Altın",
  material: "Paslanmaz Çelik",
  short:
    "Çiçek ve yaprak motifli ear climber; mikro pavé zirkon taşlarla kaplı altın renk 316L çelik kıkırdak küpe. Klips + pimli oturum; tek parça statement küpe.",
  full: `Kulak hizasından yukarı uzanan çiçek-yaprak siluetli ear climber tasarım; merkezde beş yapraklı çiçek formu ve yukarı doğru kademeli yaprak kümeleri yer alır. Tüm yüzey mikro pavé zirkon taşlarla kaplanmış; altın renk 316L paslanmaz çelik gövde parlak ve dayanıklı bir ışıltı sunar.

Arka tarafta pim + kelebek klips ve kıkırdak kanca mekanizması birlikte çalışır; küpe kulak kenarında sabit durur, gün boyu kayma yapmaz. Düğün, nişan, gece daveti ve özel gün kombinlerinde tek parça ile güçlü bir vurgu yaratır.

Özellikler:
• Materyal: 316L paslanmaz çelik (hipoalerjenik, kararmaya dayanıklı)
• Taş: Parlak kesim mikro pavé zirkon
• Renk: Altın kaplama görünüm
• Tip: Kıkırdak küpe / ear cuff (tek parça)
• Kargo: Ücretsiz ve sigortalı gönderim
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
  images: [
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula388-bc4b98de-4565-4669-b48e-e07964586ecf.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula388_2_-b6f14f4a-8348-4dd8-9ea4-e923e932d221.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula388_3_-74bfcf79-477b-492c-a2df-b98a9169b56a.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula388_4_-1cc5a885-9f74-48b6-a26d-e015899d79ed.png",
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
  console.log(`  /urunler/${inserted.slug}`);
  console.log(`  site ${SITE_PRICE}₺ · TY ${TY_PRICE}₺ · stok ${STOCK}`);

  const { data: integration } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls);
    console.log(`${ty.ok ? "✓" : "✗"} Trendyol HTTP ${ty.httpStatus} — batch: ${ty.batchRequestId ?? "yok"}`);
  }

  console.log(JSON.stringify({ ok: true, sku: SKU, slug: PRODUCT.slug, images: imageUrls.length }, null, 2));
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
