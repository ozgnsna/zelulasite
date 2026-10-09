/**
 * Zelula426 pembe retro · Zelula427 mozaik kalp · Zelula428 zümrüt yelpaze · Zelula429 gümüş yaprak
 * Alış 150₺ → site 599/699 · TY 999/1099
 *   node scripts/import-zelula426-429-kupe-batch.mjs
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

const IMG = {
  pembe:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_Pembe_ve_Renkli_Alt_n_Halka_K_peler-6b854089-4182-46de-8969-b94afe3455cd.jpg",
  kalp:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_Mozaik_Emaye_Kalpli_Alt_n_K_peler-8405c61b-d50b-4e27-9395-ffa247a8fb0f.jpg",
  zumrut:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_P_rlanta_Yelpazeli_Z_mr_t_K_peler-40e68dc3-b221-4a51-b61b-671777ebd4a5.jpg",
  yaprak:
    "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_G_m___Ta_l__Yaprak_Motifli_K_peler-00181e1d-1de8-405a-b63c-f23dafdc3864.jpg",
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
    sku: "Zelula426",
    stock: 2,
    slug: "retro-orbit-pembe-turkuaz-altin-yuvarlak-stud-kupe",
    name: "Retro Orbit Pembe Turkuaz Altın Yuvarlak Stud Küpe",
    color: "Pembe / Altın",
    material: "Paslanmaz Çelik",
    sizeNote: "yaklaşık 2 cm çap",
    short:
      "Pembe, turkuaz ve mint emaye halkalar, altın boncuk kenar. Retro yuvarlak stud — ortalama çap ~2 cm.",
    full: `Merkezde parlak pembe kaboson; turkuaz, pembe ve mint emaye halkalar altın ton boncuk halkalarla ayrılır, dış kenarda dolgun altın boncuk çerçeve. Renkli retro-pop siluet günlük kombinlere neşe katar.

Boyut: ortalama çap yaklaşık 2 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir; stud oturumu kulakta dengeli durur. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton) + emaye
• Boyut: ~2 cm çap
• Tip: Yuvarlak stud küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.pembe],
    attributes: attrs({ webColor: 7006, model: 937, color: "Pembe / Altın" }),
  },
  {
    sku: "Zelula427",
    stock: 1,
    slug: "mosaic-heart-renkli-emaye-altin-kalp-stud-kupe",
    name: "Mosaic Heart Renkli Emaye Altın Kalp Stud Küpe",
    color: "Çok Renkli / Altın",
    material: "Paslanmaz Çelik",
    sizeNote: "1,5 cm",
    short:
      "Geometrik mozaik emaye kalp: fuşya, mavi, krem, mint. Altın ızgara — boy ~1,5 cm.",
    full: `Kalp formu altın ton ızgara ile üçgen ve dörtgen panellere bölünür; fuşya, açık mavi, krem, mint ve soft pembe emaye dolgular vitray etkisi yaratır. Parlak ve neşeli statement stud.

Boyut: yaklaşık 1,5 cm.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir; stud oturumu kulakta dengeli durur. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton) + emaye
• Boyut: ~1,5 cm
• Tip: Kalp stud küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.kalp],
    attributes: attrs({ webColor: 686230, model: 937, color: "Çok Renkli" }),
  },
  {
    sku: "Zelula428",
    stock: 1,
    slug: "emerald-fan-zumrut-yelpazeli-altin-stud-kupe",
    name: "Emerald Fan Zümrüt Yelpazeli Altın Stud Küpe",
    color: "Yeşil / Altın",
    material: "Paslanmaz Çelik",
    sizeNote: "~1 cm",
    short:
      "Damla zümrüt yeşil taş + üstte pavé zirkon yelpaze. Retro art deco stud — ürün boyutu ~1 cm.",
    full: `Altta fasetli damla form zümrüt yeşil taş (altın bezel); üstte milgrain kenarlı üç sıralı pavé zirkon yelpaze/kemer. Gümüş-oksit ton yelpaze ile altın taş çerçevesi iki tonlu retro ışıltı sunar.

Boyut: ürün boyu yaklaşık 1 cm.

316L paslanmaz çelik hipoalerjeniktir; stud oturumu kulakta dengeli durur. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın + gümüş ton)
• Taş: Zümrüt yeşil damla + pavé zirkon
• Boyut: ~1 cm
• Tip: Stud küpe — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.zumrut],
    attributes: attrs({ webColor: 7012, model: 937, color: "Yeşil / Altın" }),
  },
  {
    sku: "Zelula429",
    stock: 1,
    slug: "silver-frond-gumus-yaprak-pave-huggie-kupe",
    name: "Silver Frond Gümüş Renk Yaprak Pavé Huggie Küpe",
    color: "Gümüş",
    material: "Paslanmaz Çelik",
    sizeNote: "~1 cm",
    short:
      "Ortada pavé zirkon sıra, yanlarda yaprak motifleri. Gümüş renk menteşeli huggie — ~1 cm.",
    full: `Dikey altı taşlı pavé zirkon sıra; iki yanda sivri yaprak/petal metal detaylar. Menteşeli huggie halka, kulak memesine yakın oturur — zarif ve ışıltılı.

Boyut: yaklaşık 1 cm.

316L paslanmaz çelik gümüş renk gövde hipoalerjeniktir. Çift üründür.

Özellikler:
• Materyal: 316L paslanmaz çelik (gümüş renk)
• Taş: Pavé zirkon
• Boyut: ~1 cm
• Tip: Huggie / yaprak motifli halka — çift
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [IMG.yaprak],
    attributes: attrs({ webColor: 7000, model: 938, color: "Gümüş" }),
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
    console.log(JSON.stringify({ dryRun: true, sku: def.sku, name: def.name, stock: def.stock, size: def.sizeNote }, null, 2));
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
    `  site ${SITE_PRICE}₺ · TY ${TY_SALE}/${TY_LIST}₺ · alış ${COST_PRICE}₺ · stok ${def.stock} · ${def.sizeNote}`,
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
