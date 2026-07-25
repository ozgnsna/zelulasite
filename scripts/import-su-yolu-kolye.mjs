/**
 * Gümüş renk çelik su yolu kolye — DB + görseller + Trendyol gönderimi.
 *   node scripts/import-su-yolu-kolye.mjs
 *   node scripts/import-su-yolu-kolye.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BUCKET = "product-images";
const ASSETS_DIR = path.resolve(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-ozgun-zelulasite/assets",
);

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_TY = process.argv.includes("--skip-ty");

const BRAND_ID = "2489862";
const CATEGORY_ID = "2853";
const VAT_RATE = 20;
const SITE_PRICE = 599;
const TY_SALE_PRICE = 699;
const STOCK = 1;

const PRODUCT = {
  name: "Lumière Stream Zirkon Taşlı Gümüş Renk Çelik Su Yolu Kolye",
  color: "Gümüş",
  material: "Paslanmaz Çelik",
  short:
    "Sıralı zirkon taşlı, gümüş renk 316L paslanmaz çelik su yolu kolye. Boyundan omuz hizasına kadar zarif ışıltı; gündüzden geceye her kombine uyum sağlar.",
  full: `Zirkon taşlarla bezelenmiş su yolu (tennis) formundaki bu kolye, gümüş renk 316L paslanmaz çelik zincir üzerinde kesintisiz bir ışıltı sunar. Her taş dört pençe (prong) ayarıyla sabitlenmiş; entegre kutu klipsi sayesinde takıldığında düzgün ve bütünlüklü bir çizgi oluşturur.

Günlük stilde minimal şıklık, akşam kombinlerinde ise zarif bir vurgu arayanlar için idealdir. Hafif yapısı boyun bölgesinde konfor sağlar; suya dayanıklı çelik gövde kararma yapmaz.

Özellikler:
• Materyal: 316L paslanmaz çelik (hipoalerjenik, kararmaz)
• Taş: Parlak kesim zirkon taşlar
• Renk: Gümüş
• Kargo: Ücretsiz ve sigortalı gönderim
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
  images: [
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_25_35-f297f6ad-2231-4993-b0c0-ba6c296e7cb5.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_25_45-11d9968c-899c-4168-82d4-1cd7d3469d1e.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_23_16-458f521b-ea59-4f74-b9d6-7fdd572c13ae.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_23_31-c85553dd-2dc2-4c75-8e6d-f0d8c8784e9b.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_25_22-bf076776-f4df-4b4b-a292-4fb269e70644.png",
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_ChatGPT_Image_15_Tem_2026_22_24_13-33e87156-a9c2-45c9-99e5-6b3c636db2f9.png",
  ],
};

const TRENDYOL_ATTRIBUTES = [
  { attributeId: 14, attributeValueId: 688 },
  { attributeId: 1192, attributeValueId: 10617300 },
  { attributeId: 346, attributeValueId: 4292 },
  { attributeId: 343, attributeValueId: 4295 },
  { attributeId: 260, attributeValueId: 2475 },
  { attributeId: 49, attributeValueId: 19928 },
  { attributeId: 1204, attributeValueId: 10621740 },
  { attributeId: 348, attributeValueId: 7000 },
  { attributeId: 338, attributeValueId: 1196316 },
  { attributeId: 47, customAttributeValue: "Gümüş" },
];

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

function slugify(input) {
  return String(input ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function parseZelula(s) {
  const m = String(s ?? "").match(/^Zelula\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function trim(v) {
  return String(v ?? "").trim();
}

async function fetchNextSku(admin) {
  const values = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("products")
      .select("sku,trendyol_barcode")
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    for (const row of batch) {
      if (row.sku) values.push(String(row.sku));
      if (row.trendyol_barcode) values.push(String(row.trendyol_barcode));
    }
    if (batch.length < 1000) break;
    offset += 1000;
  }
  let max = 0;
  for (const v of values) {
    const n = parseZelula(v);
    if (n != null && n > max) max = n;
  }
  return `Zelula${max + 1}`;
}

async function uploadImages(admin, productId, imageFiles) {
  const urls = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const localPath = imageFiles[i];
    const bytes = fs.readFileSync(localPath);
    const storagePath = `products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (uploadError) throw new Error(`Görsel yüklenemedi: ${uploadError.message}`);
    const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const { error: insertError } = await admin.from("product_images").insert({
      product_id: productId,
      image_url: data.publicUrl,
      is_cover: i === 0,
      sort_order: i,
    });
    if (insertError) throw new Error(`Görsel kaydı eklenemedi: ${insertError.message}`);
    urls.push(data.publicUrl);
  }
  return urls;
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
        listPrice: TY_SALE_PRICE,
        salePrice: TY_SALE_PRICE,
        vatRate: VAT_RATE,
        images: imageUrls.slice(0, 8).map((url) => ({ url })),
        attributes: TRENDYOL_ATTRIBUTES,
      },
    ],
  };

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

  const batchRequestId = body?.batchRequestId ?? null;
  const message = res.ok
    ? "Product batch sent."
    : `Trendyol HTTP ${res.status} — ${JSON.stringify(body).slice(0, 300)}`;

  await admin.from("marketplace_product_links").upsert(
    {
      integration_id: integration.id,
      marketplace: "trendyol",
      product_id: product.id,
      barcode,
      stock_code: stockCode,
      batch_request_id: batchRequestId,
      status: res.ok ? "pending" : "failed",
      last_error: res.ok ? null : message,
      last_payload: payload,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_id,product_id" },
  );

  await admin.from("marketplace_sync_logs").insert({
    integration_id: integration.id,
    marketplace: "trendyol",
    entity_type: "product",
    entity_id: product.id,
    action: "product_sync",
    status: res.ok ? "pending" : "error",
    message,
    batch_request_id: batchRequestId,
    request_payload: payload,
    response_payload: body,
  });

  return { ok: res.ok, httpStatus: res.status, batchRequestId, message, body };
}

async function run() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env eksik");
  }

  const imagePaths = PRODUCT.images.map((f) => path.join(ASSETS_DIR, f));
  for (const p of imagePaths) {
    if (!fs.existsSync(p)) throw new Error(`Görsel yok: ${p}`);
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: category, error: catError } = await admin
    .from("categories")
    .select("id,slug")
    .eq("slug", "kolye")
    .maybeSingle();
  if (catError || !category?.id) throw new Error("Kolye kategorisi bulunamadı");

  const sku = await fetchNextSku(admin);
  const slug = slugify(PRODUCT.name);

  const payload = {
    name: PRODUCT.name,
    slug,
    short_description: PRODUCT.short,
    full_description: PRODUCT.full,
    price: SITE_PRICE,
    compare_at_price: TY_SALE_PRICE,
    sku,
    stock_quantity: STOCK,
    featured: false,
    new_arrival: true,
    category_id: category.id,
    target_audience: "kadin",
    collection_id: null,
    material: PRODUCT.material,
    color: PRODUCT.color,
    is_active: true,
    trendyol_barcode: sku,
    trendyol_stock_code: sku,
    trendyol_active: true,
    trendyol_brand: BRAND_ID,
    trendyol_category_id: CATEGORY_ID,
    trendyol_category_attributes: TRENDYOL_ATTRIBUTES,
    trendyol_sale_price: TY_SALE_PRICE,
    trendyol_list_price: TY_SALE_PRICE,
    trendyol_vat_rate: VAT_RATE,
    trendyol_dimensional_weight: 1,
    trendyol_quantity: STOCK,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku, slug, payload, images: imagePaths.length }, null, 2));
    return;
  }

  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert(payload)
    .select("id,sku,slug,name,full_description")
    .maybeSingle();
  if (insertError || !inserted?.id) {
    throw new Error(`Ürün eklenemedi: ${insertError?.message ?? "unknown"}`);
  }

  const imageUrls = await uploadImages(admin, inserted.id, imagePaths);
  console.log(`✓ DB: ${inserted.sku} — ${inserted.name}`);
  console.log(`  slug: ${inserted.slug}`);
  console.log(`  görseller: ${imageUrls.length}`);

  if (SKIP_TY) {
    console.log(JSON.stringify({ ok: true, sku: inserted.sku, slug: inserted.slug, imageUrls }, null, 2));
    return;
  }

  const { data: integration, error: intErr } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();

  if (intErr || !integration?.is_active || !integration.api_key || !integration.api_secret) {
    console.log("⚠ Trendyol entegrasyonu pasif — ürün sadece DB'ye eklendi.");
    console.log(JSON.stringify({ ok: true, sku: inserted.sku, slug: inserted.slug, trendyol: "skipped" }, null, 2));
    return;
  }

  const ty = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls);
  console.log(`${ty.ok ? "✓" : "✗"} Trendyol — HTTP ${ty.httpStatus} — batch: ${ty.batchRequestId ?? "yok"}`);
  if (!ty.ok) console.log(ty.message);

  console.log(
    JSON.stringify(
      {
        ok: true,
        sku: inserted.sku,
        slug: inserted.slug,
        url: `/urunler/${inserted.slug}`,
        price: SITE_PRICE,
        trendyolPrice: TY_SALE_PRICE,
        stock: STOCK,
        trendyol: ty,
      },
      null,
      2,
    ),
  );
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
