/**
 * Zelula418 — pavé zirkon kuş figürlü altın renk çelik kolye
 *   node scripts/import-zelula418-bird-cascade-kolye.mjs
 *   node scripts/import-zelula418-bird-cascade-kolye.mjs --dry-run
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
const SKU = "Zelula418";
const SITE_PRICE = 899;
const TY_PRICE = 1099;
const COST_PRICE = 300;
const STOCK = 1;
const BRAND_ID = "2489862";
/** Trendyol: Kolye */
const CATEGORY_ID = "2853";
const VAT_RATE = 20;

const TRENDYOL_ATTRIBUTES = [
  { attributeId: 14, attributeValueId: 688 },
  { attributeId: 1192, attributeValueId: 10617300 },
  { attributeId: 346, attributeValueId: 4292 },
  { attributeId: 343, attributeValueId: 4295 },
  { attributeId: 260, attributeValueId: 2475 },
  { attributeId: 49, attributeValueId: 19928 },
  { attributeId: 1204, attributeValueId: 10621740 },
  { attributeId: 348, attributeValueId: 6996 },
  { attributeId: 338, attributeValueId: 1196316 },
  { attributeId: 47, customAttributeValue: "Gold" },
];

const PRODUCT = {
  slug: "aves-cascade-pave-kus-altin-renk-celik-kolye",
  name: "Aves Cascade Pavé Zirkon Kuş Figürlü Altın Renk Çelik Kolye",
  color: "Altın / Gümüş",
  material: "Paslanmaz Çelik",
  short:
    "Altın renk zincir üzerinde pavé zirkon kanatlı kuş pendant; üç damla sarkıt. 316L çelik statement kolye — boyun kökünde ışıltılı vurgu.",
  full: `Altın renk 316L paslanmaz çelik zincir, paperclip/oval geçiş halkalarıyla merkeze bağlanır. Ortada kanatlarını açmış gümüş ton kuş figürü: gövde ve kanatlar pavé zirkon taşlarla kaplıdır; göğüste markiz kesim merkezi taş. Kuşun altından üç dikey sarkıt iner — yanlar iki, ortada daha uzun — her biri yuvarlak taşlı halkalarla bitip romboid metal charm ile tamamlanır.

Statement siluet bohem-şık ve gece kombinlerinde dikkat çeker; hafif çelik yapı gün boyu konforlu takım sağlar. Klips + uzatma zinciri ile ayarlanabilir boy.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın renk zincir + gümüş ton pendant)
• Taş: Pavé zirkon + markiz kesim merkezi taş
• Tip: Statement kuş figürlü kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
  images: [
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_9_Eyl_2026_19_30_01-a15034e5-f56e-4852-a7f9-35004dc550d9.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_9_Eyl_2026_19_35_05-43d1d1f3-def4-4420-9a7c-6bc50bc5c8e3.jpg",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_9_Eyl_2026_19_46_37-0173df1d-fe6f-46c4-a5c8-66c62630c74a.jpg",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_9_Eyl_2026_19_47_45-474cf1f4-5fad-4246-811a-c83edc03391e.jpg",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_9_Eyl_2026_19_40_23-0f553972-6c49-468f-b461-7b082adff6e7.jpg",
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

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function uploadImages(admin, productId, imageFiles) {
  const urls = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const bytes = fs.readFileSync(imageFiles[i]);
    const ext = path.extname(imageFiles[i]).toLowerCase() || ".png";
    const storagePath = `products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: contentTypeFor(imageFiles[i]),
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

  const { data: category } = await admin.from("categories").select("id").eq("slug", "kolye").maybeSingle();
  if (!category?.id) throw new Error("Kolye kategorisi bulunamadı");

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
  console.log(`  site ${SITE_PRICE}₺ · TY ${TY_PRICE}₺ · alış ${COST_PRICE}₺ · stok ${STOCK}`);

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
