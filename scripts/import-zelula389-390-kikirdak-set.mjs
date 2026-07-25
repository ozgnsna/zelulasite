/**
 * Zelula389 (gümüş) + Zelula390 (altın) — 5 parça zirkon kıkırdak küpe seti
 *   node scripts/import-zelula389-390-kikirdak-set.mjs
 *   node scripts/import-zelula389-390-kikirdak-set.mjs --dry-run
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
const SITE_PRICE = 899;
const TY_PRICE = 999;
const STOCK = 1;
const BRAND_ID = "2489862";
const CATEGORY_ID = "3417";
const VAT_RATE = 20;

const BASE_TRENDYOL_ATTRIBUTES = [
  { attributeId: 433, attributeValueId: 1195128 },
  { attributeId: 1192, attributeValueId: 10617300 },
  { attributeId: 348, attributeValueId: 6996 },
  { attributeId: 1204, attributeValueId: 10621740 },
  { attributeId: 260, attributeValueId: 2475 },
  { attributeId: 343, attributeValueId: 4296 },
  { attributeId: 14, attributeValueId: 688 },
  { attributeId: 346, attributeValueId: 4292 },
  { attributeId: 32, attributeValueId: 870 },
];

function buildTyAttributes(colorLabel) {
  return [...BASE_TRENDYOL_ATTRIBUTES, { attributeId: 47, customAttributeValue: colorLabel }];
}

const SET_PIECES = `Set içeriği (5 parça):
• Tragus / iç kulak yıldız stud
• Helix tırmanıcı büyük yıldız ear climber
• Orta helix yıldız küpe
• Üst helix çok katmanlı yıldızlı ear cuff
• Lobda yıldız stud + damla sallantılı küpe

Özellikler:
• Materyal: 316L paslanmaz çelik (hipoalerjenik, kararmaya dayanıklı)
• Taş: Mikro pavé parlak kesim zirkon
• Tip: Kıkırdak küpe seti — tek kulakta koordineli kombin
• Kargo: 350₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`;

const PRODUCTS = [
  {
    sku: "Zelula389",
    slug: "celestia-orbit-gumus-5-parca-zirkon-kikirdak-kupe-seti",
    name: "Celestia Orbit Gümüş Kaplama 5 Parça Zirkon Kıkırdak Küpe Seti",
    color: "Gümüş",
    material: "Paslanmaz Çelik",
    tyColor: "Gümüş",
    short:
      "Yıldız temalı 5 parçalı kıkırdak küpe seti; tragus, helix climber, cuff ve damla sallantılı lob küpesi. Gümüş renk pavé zirkon, 316L çelik.",
    full: `Kulak boyunca yıldız izi çizen beş parçalı set; tragus studdan helix tırmanıcıya, çok katmanlı cuff ve damla sallantılı lob küpesine kadar tek kulakta tam bir gece gökyüzü kompozisyonu sunar. Tüm parçalar mikro pavé zirkon taşlarla kaplı; gümüş renk 316L paslanmaz çelik gövde parlak ve dayanıklı kalır.

Parçalar birlikte veya ayrı ayrı kullanılabilir; düğün, after party, yaz akşamı ve özel davet kombinlerinde statement etki yaratır.

${SET_PIECES}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula389-39dbd27f-9f57-47de-98ea-bfdcf896aa98.png",
    ],
  },
  {
    sku: "Zelula390",
    slug: "celestia-orbit-altin-5-parca-zirkon-kikirdak-kupe-seti",
    name: "Celestia Orbit Altın Kaplama 5 Parça Zirkon Kıkırdak Küpe Seti",
    color: "Altın",
    material: "Paslanmaz Çelik",
    tyColor: "Gold",
    short:
      "Altın renk yıldız temalı 5 parçalı kıkırdak küpe seti; helix climber, cuff, tragus stud ve damla sallantı. Pavé zirkon, 316L çelik.",
    full: `Altın kaplama görünümlü beş parçalı yıldız seti; kulak hattı boyunca kademeli büyüyen yıldız formları, çok katmanlı helix cuff ve damla kesim sallantı ile lüks bir ışıltı sunar. Her parça yoğun mikro pavé zirkon taşlarla işlenmiş; 316L paslanmaz çelik altyapı günlük kullanıma uygun dayanıklılık sağlar.

Gün batımı davetleri, romantik akşam yemekleri ve özel günlerde tek kulakta komple bir küpe hikâyesi yaratır.

${SET_PIECES}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_Zelula390-5850291f-94a1-494f-a369-d63224ef0ddf.png",
    ],
  },
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

async function pushTrendyol(integration, admin, product, imageUrls, tyAttributes) {
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
        attributes: tyAttributes,
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

async function importOne(admin, integration, categoryId, productDef) {
  const imagePaths = productDef.images.map((f) => path.join(ASSETS_DIR, f));
  for (const p of imagePaths) {
    if (!fs.existsSync(p)) throw new Error(`Görsel yok: ${p}`);
  }

  const { data: dup } = await admin.from("products").select("id").eq("sku", productDef.sku).maybeSingle();
  if (dup?.id) throw new Error(`${productDef.sku} zaten mevcut`);

  const tyAttributes = buildTyAttributes(productDef.tyColor);
  const payload = {
    name: productDef.name,
    slug: productDef.slug,
    short_description: productDef.short,
    full_description: productDef.full,
    price: SITE_PRICE,
    compare_at_price: TY_PRICE,
    sku: productDef.sku,
    stock_quantity: STOCK,
    featured: false,
    new_arrival: true,
    category_id: categoryId,
    target_audience: "kadin",
    material: productDef.material,
    color: productDef.color,
    is_active: true,
    trendyol_barcode: productDef.sku,
    trendyol_stock_code: productDef.sku,
    trendyol_active: true,
    trendyol_brand: BRAND_ID,
    trendyol_category_id: CATEGORY_ID,
    trendyol_category_attributes: tyAttributes,
    trendyol_sale_price: TY_PRICE,
    trendyol_list_price: TY_PRICE,
    trendyol_vat_rate: VAT_RATE,
    trendyol_dimensional_weight: 1,
    trendyol_quantity: STOCK,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku: productDef.sku, payload, images: imagePaths.length }, null, 2));
    return { sku: productDef.sku, dryRun: true };
  }

  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert(payload)
    .select("id,sku,slug,name")
    .maybeSingle();
  if (insertError || !inserted?.id) throw new Error(insertError?.message ?? `${productDef.sku} insert failed`);

  const imageUrls = await uploadImages(admin, inserted.id, imagePaths);
  console.log(`✓ DB: ${inserted.sku} — ${inserted.name}`);
  console.log(`  https://www.zeluladesign.com/urunler/${inserted.slug}`);
  console.log(`  site ${SITE_PRICE}₺ · TY ${TY_PRICE}₺ · stok ${STOCK}`);

  let tyResult = null;
  if (integration?.is_active && integration.api_key && integration.api_secret) {
    tyResult = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls, tyAttributes);
    console.log(
      `${tyResult.ok ? "✓" : "✗"} Trendyol ${productDef.sku} HTTP ${tyResult.httpStatus} — batch: ${tyResult.batchRequestId ?? "yok"}`,
    );
  }

  return { sku: productDef.sku, slug: productDef.slug, ty: tyResult };
}

async function run() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: category } = await admin.from("categories").select("id").eq("slug", "kupe").maybeSingle();
  if (!category?.id) throw new Error("Küpe kategorisi bulunamadı");

  const { data: integration } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();

  const results = [];
  for (const productDef of PRODUCTS) {
    results.push(await importOne(admin, integration, category.id, productDef));
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
