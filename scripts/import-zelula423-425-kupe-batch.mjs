/**
 * Zelula423 Turkuaz · Zelula424 Güneş/Ay · Zelula425 Gümüş çiçek
 * Alış 150₺ → site 599/699 · TY 999/1099 (komisyon %22.5 + stopaj %1 + kargo 150)
 *   node scripts/import-zelula423-425-kupe-batch.mjs
 *   node scripts/import-zelula423-425-kupe-batch.mjs --dry-run
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
const CATEGORY_ID = "2846"; // Çelik Küpe (3417 = kıkırdak)
const VAT_RATE = 20;

const IMG = {
  turkuaz:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_Turkuaz_Ta_l__Alt_n_Sallant_l__K_peler-cc43310c-4cfb-4431-bb05-7a487f632843.jpg",
  gunes:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_G_ne__ve_Ay_Temal__Alt_n_K_peler-55778bd8-ca83-4979-adf2-f92b99f759c3.jpg",
  cicek:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_G_m___P_rlanta__i_ek_K_pe__ifti-a2b7f4c1-6f71-464a-ab20-323801760c96.jpg",
};

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
    sku: "Zelula423",
    stock: 1,
    slug: "azure-cascade-turkuaz-inci-altin-sallantili-kupe",
    name: "Azure Cascade Turkuaz Taşlı İnci Altın Sallantılı Küpe",
    color: "Altın / Turkuaz",
    material: "Paslanmaz Çelik",
    short:
      "İki oval turkuaz kaboson ve damla inci. Altın ton milgrain çerçeveli vintage sallantılı küpe çifti.",
    full: `Üstte büyük oval turkuaz kaboson, ortada ikinci turkuaz taş ve en altta damla form beyaz inci; her taş altın ton milgrain (boncuklu) çerçevede. Damarlı turkuaz mavi tonları ve inci ışıltısı bohem-vintage bir siluet sunar.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir; stud oturumu kulakta dengeli durur. Özel gün ve yaz kombinleri için statement çift küpedir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Turkuaz kaboson + inci
• Tip: Sallantılı statement küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.turkuaz],
    attributes: attrs({ webColor: 6996, model: 939, color: "Altın / Turkuaz" }),
  },
  {
    sku: "Zelula424",
    stock: 2,
    slug: "sol-luna-gunes-ay-altin-sallantili-kupe",
    name: "Sol Luna Güneş ve Ay Temalı Altın Sallantılı Küpe",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short:
      "Güneş yüzü, hilal ay ve pavé siyah taşlı ay uç. Antik altın ton üç katmanlı celestial sallantılı küpe.",
    full: `Üstte alev ışınlı güneş madalyonu (yüz detaylı), ortada dokulu hilal ay madalyonu, altta pavé siyah taşlı küçük hilal. Eskitilmiş altın ton yüzey ve koyu gölgeler motifleri öne çıkarır — gece ve festival kombinlerine uygun celestial statement.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir; stud oturumu kulakta dengeli durur. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (antik altın ton)
• Detay: Güneş + ay figürleri, pavé taşlı uç
• Tip: Sallantılı statement küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.gunes],
    attributes: attrs({ webColor: 6996, model: 939, color: "Altın" }),
  },
  {
    sku: "Zelula425",
    stock: 1,
    slug: "flora-spark-gumus-pave-cicek-kupe",
    name: "Flora Spark Gümüş Renk Pavé Zirkon Çiçek Küpe",
    color: "Gümüş",
    material: "Paslanmaz Çelik",
    short:
      "Çok katmanlı çiçek/güneş formu, pavé zirkon taç yapraklar. Gümüş renk ışıltılı statement küpe çifti.",
    full: `Merkezden açılan kıvrımlı taç yapraklar ve pavé zirkon taşlarla kaplı çiçek silueti; üstte taşlı kavisli oturum. Parlak gümüş ton metal, gece ve özel gün kombinlerinde dikkat çeken statement parça.

316L paslanmaz çelik gümüş renk gövde hipoalerjeniktir; kulakta dengeli durur. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (gümüş renk)
• Taş: Pavé zirkon
• Tip: Statement çiçek küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.cicek],
    attributes: attrs({ webColor: 7000, model: 870, color: "Gümüş" }),
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
    console.log(JSON.stringify({ dryRun: true, sku: def.sku, name: def.name, stock: def.stock }, null, 2));
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
  console.log(
    `  site ${SITE_PRICE}₺ (üstü çizili ${COMPARE_AT}₺) · TY ${TY_SALE}/${TY_LIST}₺ · alış ${COST_PRICE}₺ · stok ${def.stock}`,
  );

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(
      integration,
      admin,
      { ...inserted, ...payload },
      imageUrls,
      def.stock,
      def.attributes,
    );
    console.log(`${ty.ok ? "✓" : "✗"} Trendyol HTTP ${ty.httpStatus} — batch: ${ty.batchRequestId ?? "yok"}`);
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
    if (!DRY_RUN) await new Promise((r) => setTimeout(r, 2500));
  }

  console.log(JSON.stringify({ ok: true, count: PRODUCTS.length }, null, 2));
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
