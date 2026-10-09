/**
 * Zelula452–456 — 5 altın kolye (stok 1’er, alış 100₺)
 * site 499/599 · TY 849/949
 *   node scripts/import-zelula452-456-kolye-batch.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { uploadLocalProductImages, uploadOneLocalProductImage } from "./lib/upload-product-images.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "product-images";
const ASSETS_DIR = path.resolve(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/d-Projeler-zelulasite/assets",
);

const DRY_RUN = process.argv.includes("--dry-run");
const SITE_PRICE = 499;
const COMPARE_AT = 599;
const TY_SALE = 849;
const TY_LIST = 949;
const COST_PRICE = 100;
const STOCK = 1;
const BRAND_ID = "2489862";
const CATEGORY_ID = "2853";
const VAT_RATE = 20;
const A =
  "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_";

function attrs({ webColor, color }) {
  return [
    { attributeId: 14, attributeValueId: 688 },
    { attributeId: 1192, attributeValueId: 10617300 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 260, attributeValueId: 2475 },
    { attributeId: 348, attributeValueId: webColor },
    { attributeId: 338, attributeValueId: 5974 },
    { attributeId: 47, customAttributeValue: color },
    { attributeId: 433, attributeValueId: 1195128 },
  ];
}

const PRODUCTS = [
  {
    sku: "Zelula452",
    slug: "stella-pearl-sedef-uc-yildiz-altin-madalyon-kolye",
    name: "Stella Pearl Sedef Üç Yıldız Altın Madalyon Kolye",
    color: "Altın / Sedef",
    short:
      "Sedef zeminli organik altın madalyon, üç yıldız + zirkon. Zarif cable zincir kolye.",
    full: `Organik kenarlı yuvarlak madalyon; sedef/inci beyaz zemin üzerinde üç altın yıldız (merkezde zirkon). İnce altın cable zincir.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Detay: Sedef + yıldız motif
• Tip: Madalyon kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Sedef_I__lt_l__Alt_n_Y_ld_z_Kolye-916dcac8-c460-4e45-a98c-3518d3e2e8ed.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın" }),
  },
  {
    sku: "Zelula453",
    slug: "sol-burst-turkuaz-gunes-altin-curb-kolye",
    name: "Sol Burst Turkuaz Güneş Altın Curb Kolye",
    color: "Altın / Turkuaz",
    short:
      "Merkez turkuaz + güneş ışını madalyon, kalın curb zincir. Bohem altın kolye.",
    full: `Yuvarlak organik kenarlı madalyon; merkezde damarlı turkuaz kaboson, çevresinde kabartmalı güneş ışınları. Kalın altın curb (gurmet) zincir.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Turkuaz
• Tip: Madalyon + curb zincir kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Turkuaz_Ta_l__G_ne__Motifli_Alt_n_Kolye-a59ba8fe-ca9d-40b7-9fdf-a3f8ea97f76d.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın / Turkuaz" }),
  },
  {
    sku: "Zelula454",
    slug: "emerald-star-zumrut-yildiz-altin-madalyon-kolye",
    name: "Emerald Star Zümrüt Yıldız Altın Madalyon Kolye",
    color: "Altın / Yeşil",
    short:
      "Yeşil merkez taş + pavé zirkon yıldız ışınları. Boncuklu altın zincir kolye.",
    full: `Yuvarlak altın madalyon; merkezde yeşil zirkon, dört ana ışında pavé berrak taşlar. Boncuk aralıklı altın snake/cable zincir.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Yeşil merkez + pavé zirkon
• Tip: Madalyon kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Z_mr_t_Ta_l__Alt_n_Y_ld_z_Kolye-51e0f985-762c-4e0a-8fad-451c690eaf63.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın / Yeşil" }),
  },
  {
    sku: "Zelula455",
    slug: "spike-sun-turkuaz-uc-sivri-altin-oval-madalyon-kolye",
    name: "Spike Sun Turkuaz Üç Sivri Altın Oval Madalyon Kolye",
    color: "Altın / Turkuaz",
    short:
      "Oval madalyon, üstte turkuaz + üç sivri uç, altta güneş ışını doku. Kalın ip zincir.",
    full: `Dikey oval madalyon; üstte damarlı turkuaz, altında üç altın küre ve sivri uç, gövdede ışınlı kabartma. Kalın altın rope (ip) zincir.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Turkuaz
• Tip: Oval madalyon kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Turkuaz_Ta_l__Alt_n_G_ne__Madalyon_Kolye-f225238b-22e7-4041-9d63-da79b7ccead5.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın / Turkuaz" }),
  },
  {
    sku: "Zelula456",
    slug: "scallop-turquoise-turkuaz-oval-altin-madalyon-kolye",
    name: "Scallop Turquoise Turkuaz Oval Altın Madalyon Kolye",
    color: "Altın / Turkuaz",
    short:
      "Büyük oval turkuaz, tarak/yelpaze kenarlı altın çerçeve. Kalın ip zincir kolye.",
    full: `Oval damarlı turkuaz taş; altın ton tarak/yelpaze kenarlı vintage çerçeve. Kalın altın rope zincir.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Oval turkuaz
• Tip: Madalyon kolye
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Turkuaz_Ta_l__Alt_n_Madalyon_Kolye-47b611ba-33a8-4f5c-a581-f3b9dfd1a579.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın / Turkuaz" }),
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

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function uploadImages(admin, productId, imageFiles) {
  return uploadLocalProductImages(admin, productId, imageFiles);
}

function tyHeaders(integration) {
  const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": `${integration.seller_id} - Zelula`,
    storeFrontCode: "TR",
  };
}

async function pushTrendyol(integration, admin, product, imageUrls, attributes) {
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
        listPrice: TY_LIST,
        salePrice: TY_SALE,
        vatRate: VAT_RATE,
        images: imageUrls.slice(0, 8).map((url) => ({ url })),
        attributes,
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

  await admin.from("marketplace_product_links").upsert(
    {
      integration_id: integration.id,
      marketplace: "trendyol",
      product_id: product.id,
      barcode,
      stock_code: stockCode,
      batch_request_id: body?.batchRequestId ?? null,
      status: res.ok ? "pending" : "failed",
      last_error: res.ok ? null : `HTTP ${res.status}`,
      last_payload: payload,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_id,product_id" },
  );

  return { ok: res.ok, httpStatus: res.status, batchRequestId: body?.batchRequestId ?? null, body };
}

async function importOne(admin, integration, categoryId, def) {
  const imagePaths = def.images.map((f) => path.join(ASSETS_DIR, f));
  for (const p of imagePaths) {
    if (!fs.existsSync(p)) throw new Error(`Görsel yok: ${p}`);
  }

  const { data: dup } = await admin.from("products").select("id").eq("sku", def.sku).maybeSingle();
  if (dup?.id) throw new Error(`${def.sku} zaten mevcut`);

  const payload = {
    name: def.name,
    slug: def.slug,
    short_description: def.short,
    full_description: def.full,
    price: SITE_PRICE,
    compare_at_price: COMPARE_AT,
    cost_price: COST_PRICE,
    sku: def.sku,
    stock_quantity: STOCK,
    featured: false,
    new_arrival: true,
    category_id: categoryId,
    target_audience: "kadin",
    material: "Paslanmaz Çelik",
    color: def.color,
    is_active: true,
    trendyol_barcode: def.sku,
    trendyol_stock_code: def.sku,
    trendyol_active: true,
    trendyol_brand: BRAND_ID,
    trendyol_category_id: CATEGORY_ID,
    trendyol_category_attributes: def.attributes,
    trendyol_sale_price: TY_SALE,
    trendyol_list_price: TY_LIST,
    trendyol_vat_rate: VAT_RATE,
    trendyol_dimensional_weight: 1,
    trendyol_quantity: STOCK,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku: def.sku, name: def.name }, null, 2));
    return;
  }

  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert(payload)
    .select("id,sku,slug,name")
    .maybeSingle();
  if (insertError || !inserted?.id) throw new Error(insertError?.message ?? "insert failed");

  const imageUrls = await uploadImages(admin, inserted.id, imagePaths);
  console.log(`✓ ${inserted.sku} — ${inserted.name}`);
  console.log(`  https://www.zeluladesign.com/urunler/${inserted.slug}`);
  console.log(`  alış ${COST_PRICE}₺ · site ${SITE_PRICE}₺ · TY ${TY_SALE}₺ · stok ${STOCK}`);

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(
      integration,
      admin,
      { ...inserted, ...payload },
      imageUrls,
      def.attributes,
    );
    console.log(`${ty.ok ? "✓" : "✗"} TY HTTP ${ty.httpStatus} batch=${ty.batchRequestId ?? "?"}`);
    if (!ty.ok) {
      console.log(JSON.stringify(ty.body, null, 2));
      throw new Error(`${def.sku} TY push failed`);
    }
  }
}

async function run() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: category } = await admin.from("categories").select("id").eq("slug", "kolye").maybeSingle();
  if (!category?.id) throw new Error("Kolye kategorisi bulunamadı");

  const { data: integration } = await admin
    .from("marketplace_integrations")
    .select("id,environment,seller_id,api_key,api_secret,is_active")
    .eq("marketplace", "trendyol")
    .maybeSingle();

  for (const def of PRODUCTS) {
    await importOne(admin, integration, category.id, def);
    if (!DRY_RUN) await new Promise((r) => setTimeout(r, 2200));
  }

  console.log(JSON.stringify({ ok: true, count: PRODUCTS.length }, null, 2));
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
