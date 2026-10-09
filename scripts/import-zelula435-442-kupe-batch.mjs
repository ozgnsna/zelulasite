/**
 * Zelula435–442 — 8 küpe (kalp, gümüş, beş taş, nazar, dalga, halka, üç taş, marquise)
 * Alış 150₺ → site 599/699 · TY 999/1099
 *   node scripts/import-zelula435-442-kupe-batch.mjs
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
const SITE_PRICE = 599;
const COMPARE_AT = 699;
const TY_SALE = 999;
const TY_LIST = 1099;
const COST_PRICE = 150;
const BRAND_ID = "2489862";
const CATEGORY_ID = "2846";
const VAT_RATE = 20;

const A = "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_";

function attrs({ webColor, model, color }) {
  return [
    { attributeId: 433, attributeValueId: 1195128 },
    { attributeId: 1192, attributeValueId: 10617300 },
    { attributeId: 348, attributeValueId: webColor },
    { attributeId: 1204, attributeValueId: 10621740 },
    { attributeId: 260, attributeValueId: 2475 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 14, attributeValueId: 688 },
    { attributeId: 346, attributeValueId: 4292 },
    { attributeId: 32, attributeValueId: model },
    { attributeId: 47, customAttributeValue: color },
  ];
}

const PRODUCTS = [
  {
    sku: "Zelula435",
    stock: 1,
    size: "~1 cm çap",
    slug: "heart-huggie-pave-kalpli-altin-halka-kupe",
    name: "Heart Huggie Pavé Kalpli Altın Halka Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Pavé zirkon kalp charm’lı altın huggie halka. Küçük ve ışıltılı — çap ~1 cm.",
    full: `Menteşeli altın ton huggie halka; ön yüzde pavé zirkon kaplı kalp charm. Günlük kombinlere romantik vurgu.

Boyut: yaklaşık 1 cm çap.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Pavé zirkon kalp
• Boyut: ~1 cm çap
• Tip: Huggie halka — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}P_rlanta_Kalpli_Alt_n_Halka_K_peler-1b52f930-8909-43e9-96b9-fb1c0e05cba9.jpg`],
    attributes: attrs({ webColor: 6996, model: 938, color: "Altın" }),
  },
  {
    sku: "Zelula436",
    stock: 1,
    size: "~1 cm",
    slug: "argent-marquise-gumus-dokulu-marquise-huggie-kupe",
    name: "Argent Marquise Gümüş Dokulu Marquise Huggie Küpe",
    color: "Gümüş",
    material: "Paslanmaz Çelik",
    short: "Üç katmanlı gümüş huggie; merkezde marquise zirkon halo. Ortalama boy ~1 cm.",
    full: `Gümüş ton menteşeli huggie; üst ve altta dokulu (çekiçlenmiş) şeritler, ortada marquise kesim zirkon ve pavé halo. Modern ve zarif.

Boyut: ortalama yaklaşık 1 cm.

316L paslanmaz çelik gümüş renk gövde hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (gümüş renk)
• Taş: Marquise zirkon + pavé
• Boyut: ~1 cm
• Tip: Huggie — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Zarif_P_rlanta_Marquise_K_peler-3dc0889a-cd9d-4a24-8e3f-a7edf6131d7e.jpg`],
    attributes: attrs({ webColor: 7000, model: 938, color: "Gümüş" }),
  },
  {
    sku: "Zelula437",
    stock: 2,
    size: "~1 cm boy",
    slug: "penta-line-bes-tas-altin-huggie-kupe",
    name: "Penta Line Beş Taş Altın Huggie Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Dikey beş berrak taşlı altın huggie bar. Kompakt ışıltı — boy ~1 cm.",
    full: `Önde dikey beş yuvarlak zirkon, her biri altın bezelde; arkada menteşeli huggie halka. Minimal ve ışıltılı.

Boyut: yaklaşık 1 cm boy.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: 5× zirkon
• Boyut: ~1 cm
• Tip: Huggie — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Be__Ta_l__Alt_n_K_pe__ifti-a8813326-1548-46fc-8f7d-a38f1c67ce83.jpg`],
    attributes: attrs({ webColor: 6996, model: 938, color: "Altın" }),
  },
  {
    sku: "Zelula438",
    stock: 2,
    size: "~2 cm uzunluk",
    slug: "nazar-orb-mavi-tasli-altin-kure-sallantili-kupe",
    name: "Nazar Orb Mavi Taşlı Altın Küresel Sallantılı Küpe",
    color: "Altın / Mavi",
    material: "Paslanmaz Çelik",
    short: "Altın halkadan sarkan pavé nazar küre. Mavi–beyaz zirkon — toplam uzunluk ~2 cm.",
    full: `Üstte altın ton menteşeli halka; altında pavé zirkon kaplı küre, merkezde mavi nazar motifi. Gece ve günlük kombinlere sembolik ışıltı.

Boyut: toplam uzunluk yaklaşık 2 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Pavé zirkon nazar küre
• Boyut: ~2 cm uzunluk
• Tip: Sallantılı — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Mavi_Ta_l__Alt_n_K_re_K_peler-cb10da1b-3931-43df-95fa-f003185b157d.jpg`],
    attributes: attrs({ webColor: 6996, model: 939, color: "Altın / Mavi" }),
  },
  {
    sku: "Zelula439",
    stock: 2,
    size: "~1,5 cm",
    slug: "ribbed-wave-altin-dalga-stud-kupe",
    name: "Ribbed Wave Altın Dalga Stud Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Kıvrımlı ribbed dalga form, sırtta pavé zirkon sıra. Altın stud — ortalama ~1,5 cm.",
    full: `S form / dalga siluet; yüzeyde ince dikey oluklar, dış sırtta tek sıra pavé zirkon. Akışkan ve modern statement stud.

Boyut: ortalama yaklaşık 1,5 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Pavé zirkon sıra
• Boyut: ~1,5 cm
• Tip: Stud — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Ribbed_Alt_n_Dalga_K_peler-38b5049b-dcee-44a5-aca0-7a20d911d8ef.jpg`],
    attributes: attrs({ webColor: 6996, model: 937, color: "Altın" }),
  },
  {
    sku: "Zelula440",
    stock: 2,
    size: "~1,5 cm",
    slug: "roman-halo-altin-roma-rakamli-halka-kupe",
    name: "Roman Halo Altın Roma Rakamlı Halka Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Pavé kenarlı altın huggie; ortada baget taş + Roma rakam detay. Ortalama ~1,5 cm.",
    full: `Geniş altın ton huggie halka; dış kenarlarda pavé zirkon, ortada baget taş ve Roma rakam motifleri. Lüks ve dikkat çekici.

Boyut: ortalama yaklaşık 1,5 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Pavé + baget zirkon
• Boyut: ~1,5 cm
• Tip: Huggie halka — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}L_ks_Alt_n_Ta_l__Halka_K_peler-be564f3d-d2bf-45ec-a3b0-9627571198cc.jpg`],
    attributes: attrs({ webColor: 6996, model: 938, color: "Altın" }),
  },
  {
    sku: "Zelula441",
    stock: 2,
    size: "~1 cm",
    slug: "trio-band-uc-tas-altin-j-halka-kupe",
    name: "Trio Band Üç Taş Altın J Halka Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Üç paralel altın bant, ortada üç zirkon (orta oval). J/C form stud — boy ~1 cm.",
    full: `Üç paralel kıvrımlı altın bant; enine dizilmiş üç zirkon (ortadaki oval, yanlar yuvarlak). J form stud oturumu kulakta dengeli durur.

Boyut: yaklaşık 1 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: 3× zirkon
• Boyut: ~1 cm
• Tip: J halka stud — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}___Bantl__Alt_n_P_rlanta_K_peler-55198269-423e-4559-bc5a-1f59e7315c9d.jpg`],
    attributes: attrs({ webColor: 6996, model: 938, color: "Altın" }),
  },
  {
    sku: "Zelula442",
    stock: 2,
    size: "~1,3 cm",
    slug: "marquise-spike-altin-marquise-sivri-huggie-kupe",
    name: "Marquise Spike Altın Marquise Sivri Huggie Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short: "Tek marquise zirkon + altın sivri uç. Menteşeli huggie — yaklaşık 1,3 cm.",
    full: `Önde tek marquise kesim berrak zirkon (altın bezel); altında sivri altın uç. Menteşeli huggie oturum zarif ve modern.

Boyut: yaklaşık 1,3 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Marquise zirkon
• Boyut: ~1,3 cm
• Tip: Huggie — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Alt_n_Marquise_K_pe__ifti-99a49179-c02e-44ca-b635-277aaa245149.jpg`],
    attributes: attrs({ webColor: 6996, model: 938, color: "Altın" }),
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

async function pushTrendyol(integration, admin, product, imageUrls, stock, attributes) {
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
        quantity: stock,
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
    stock_quantity: def.stock,
    featured: false,
    new_arrival: true,
    category_id: categoryId,
    target_audience: "kadin",
    material: def.material,
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
    trendyol_quantity: def.stock,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku: def.sku, name: def.name, stock: def.stock, size: def.size }, null, 2));
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
  console.log(`  stok ${def.stock} · ${def.size} · site ${SITE_PRICE}₺ · TY ${TY_SALE}₺`);

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(
      integration,
      admin,
      { ...inserted, ...payload },
      imageUrls,
      def.stock,
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

  const { data: category } = await admin.from("categories").select("id").eq("slug", "kupe").maybeSingle();
  if (!category?.id) throw new Error("Küpe kategorisi bulunamadı");

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
