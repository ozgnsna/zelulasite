/**
 * Zelula443–447 — 5 bileklik (stok 1’er)
 * 1–3 daha uygun alış · 4–5 alış 240₺
 *   node scripts/import-zelula443-447-bileklik-batch.mjs
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
const BRAND_ID = "2489862";
const CATEGORY_ID = "2845"; // Bijuteri Bileklik
const VAT_RATE = 20;
const A =
  "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_d71b2a10bf7c15cb340d9c5522ff5e89_images_";

function attrs({ webColor, color }) {
  return [
    { attributeId: 1204, attributeValueId: 10621740 },
    { attributeId: 1192, attributeValueId: 10617300 },
    { attributeId: 47, customAttributeValue: color },
    { attributeId: 348, attributeValueId: webColor },
    { attributeId: 338, attributeValueId: 6410 },
    { attributeId: 346, attributeValueId: 4293 },
    { attributeId: 433, attributeValueId: 1195128 },
    { attributeId: 260, attributeValueId: 2475 },
    { attributeId: 343, attributeValueId: 4295 },
    { attributeId: 14, attributeValueId: 688 },
  ];
}

/**
 * Alış → site / TY (komisyon %22.5 + stopaj %1 + kargo min 150)
 * 180 → 699 / 1099 · 200 → 749 / 1199 · 240 → 799 / 1299
 */
const PRODUCTS = [
  {
    sku: "Zelula443",
    cost: 180,
    site: 699,
    compare: 799,
    tySale: 1099,
    tyList: 1199,
    slug: "marquise-band-altin-marquise-tasli-ribbed-bileklik",
    name: "Marquise Band Altın Marquise Taşlı Ribbed Bileklik",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short:
      "Ribbed oval altın halkalar + ön yüzde 12 marquise zirkon. Zarif sert bileklik formu.",
    full: `Dairesel bileklik gövdesi diyagonal oluklu oval altın ton segmentlerden oluşur; ön yüzde on iki marquise kesim berrak zirkon bezelde yan yana dizilir. Kutu klipsli, günlük ve özel gün kombinlerine uygun zarif parça.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Marquise zirkon sıra
• Tip: Sert / bangle bileklik
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Alt_n_Marquise_Ta_l__Zarif_Bileklik-05222d3e-d8ca-4d2f-909c-d31f33cddd1a.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın" }),
  },
  {
    sku: "Zelula444",
    cost: 180,
    site: 699,
    compare: 799,
    tySale: 1099,
    tyList: 1199,
    slug: "clip-tri-square-altin-paperclip-kare-tasli-bileklik",
    name: "Clip Tri Square Altın Paperclip Kare Taşlı Bileklik",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short:
      "Paperclip zincir + üç kare zirkon ve marquise çiçek ara detaylar. Modern altın bileklik.",
    full: `Parlak dikdörtgen paperclip halkalar; merkezde üç büyük kare kesim zirkon, aralarında dörtlü marquise çiçek motifleri. Fold-over klipsli, şık ve modern.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Kare + marquise zirkon
• Tip: Zincir bileklik
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Alt_n_Zincir_ve_P_rlanta_Detayl__Bileklik-c166d204-e8e0-4d2d-921c-27e399004e3f.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın" }),
  },
  {
    sku: "Zelula445",
    cost: 200,
    site: 749,
    compare: 849,
    tySale: 1199,
    tyList: 1299,
    slug: "pear-kite-altin-damla-halo-kite-link-bileklik",
    name: "Pear Kite Altın Damla Halo Kite Link Bileklik",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short:
      "Merkezde damla halo zirkon; kite form altın ve pavé halkalar. Lüks statement bileklik.",
    full: `Odakta pear/damla kesim merkez taş + pavé halo; bantta parlak kite altın halkalar ile pavé zirkon dolu kite halkalar dönüşümlü. Menteşeli esnek yapı, fold-over klips.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Damla halo + pavé zirkon
• Tip: Link bileklik
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}P_rlanta_Detayl__Alt_n_Bileklik-eb4dd3c9-6eb9-41b7-b977-694252156d40.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın" }),
  },
  {
    sku: "Zelula446",
    cost: 240,
    site: 799,
    compare: 899,
    tySale: 1299,
    tyList: 1399,
    slug: "chevron-square-altin-chevron-kare-halo-bileklik",
    name: "Chevron Square Altın Chevron Kare Halo Bileklik",
    color: "Altın",
    material: "Paslanmaz Çelik",
    short:
      "Kare yastık kesim halo merkez + V/chevron altın halkalar. Statement bileklik.",
    full: `Merkezde büyük kare/yastık kesim berrak taş ve pavé halo; iki yana açılan V (chevron) form parlak altın halkalar. Fold-over klipsli, güçlü görsel vurgu.

316L paslanmaz çelik altın kaplama görünüm hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (altın ton)
• Taş: Kare halo zirkon
• Tip: Link bileklik
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Alt_n_Chevon_Desenli_P_rlanta_Bileklik-61314219-69a1-469c-a0c4-e14460b24a20.jpg`],
    attributes: attrs({ webColor: 6996, color: "Altın" }),
  },
  {
    sku: "Zelula447",
    cost: 240,
    site: 799,
    compare: 899,
    tySale: 1299,
    tyList: 1399,
    slug: "ice-link-gumus-pave-kalin-zincir-bileklik",
    name: "Ice Link Gümüş Pavé Kalın Zincir Bileklik",
    color: "Gümüş",
    material: "Paslanmaz Çelik",
    short:
      "Üç sıra gümüş link + pavé dikdörtgen merkez plaka. Iced-out statement bileklik.",
    full: `Kalın üç sıra interlocking gümüş ton halkalar; düz parlak ve pavé şeritli segmentler dönüşümlü. Merkezde yoğun pavé dikdörtgen plaka ve yan kanat detayları. Güçlü, ışıltılı statement parça.

316L paslanmaz çelik gümüş renk gövde hipoalerjeniktir.

Özellikler:
• Materyal: 316L paslanmaz çelik (gümüş renk)
• Taş: Pavé zirkon
• Tip: Kalın zincir bileklik
• Kargo: 650₺ üzeri ücretsiz
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`,
    images: [`${A}Elmas_Par_lt_l__G_m___Zincir_Bileklik-b1de6728-d502-4194-b5ba-99a488ad432d.jpg`],
    attributes: attrs({ webColor: 7000, color: "Gümüş" }),
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

async function pushTrendyol(integration, admin, product, imageUrls, def) {
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
        quantity: 1,
        stockCode,
        dimensionalWeight: 1,
        description: product.full_description,
        currencyType: "TRY",
        listPrice: def.tyList,
        salePrice: def.tySale,
        vatRate: VAT_RATE,
        images: imageUrls.slice(0, 8).map((url) => ({ url })),
        attributes: def.attributes,
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
    price: def.site,
    compare_at_price: def.compare,
    cost_price: def.cost,
    sku: def.sku,
    stock_quantity: 1,
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
    trendyol_sale_price: def.tySale,
    trendyol_list_price: def.tyList,
    trendyol_vat_rate: VAT_RATE,
    trendyol_dimensional_weight: 1,
    trendyol_quantity: 1,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, sku: def.sku, cost: def.cost, site: def.site, ty: def.tySale }, null, 2));
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
  console.log(`  alış ${def.cost}₺ · site ${def.site}/${def.compare}₺ · TY ${def.tySale}/${def.tyList}₺ · stok 1`);

  if (integration?.is_active && integration.api_key && integration.api_secret) {
    const ty = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls, def);
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

  const { data: category } = await admin.from("categories").select("id").eq("slug", "bileklik").maybeSingle();
  if (!category?.id) throw new Error("Bileklik kategorisi bulunamadı");

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
