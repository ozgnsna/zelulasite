/**
 * 4 yeni çelik halhal — DB + görseller + Trendyol.
 *   node scripts/import-halhal-batch.mjs
 *   node scripts/import-halhal-batch.mjs --dry-run
 *   node scripts/import-halhal-batch.mjs --skip-ty
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
const CATEGORY_ID = "3500";
const VAT_RATE = 20;
const SITE_PRICE = 349;
const TY_PRICE = 449;
const STOCK = 1;

const COMMON_FOOTER = `Özellikler:
• Materyal: 316L paslanmaz çelik (hipoalerjenik, kararmaya dayanıklı)
• Kaplama: Altın renk
• Ayarlanabilir zincir + klips kapatma
• Kargo: Ücretsiz ve sigortalı gönderim
• İade: 14 gün koşulsuz ücretsiz iade
• Özel hediye kutusunda gönderilir`;

const TRENDYOL_ATTRIBUTES = [
  { attributeId: 348, attributeValueId: 7004 },
  { attributeId: 1192, attributeValueId: 10617300 },
  { attributeId: 346, attributeValueId: 4292 },
  { attributeId: 14, attributeValueId: 688 },
  { attributeId: 343, attributeValueId: 4295 },
  { attributeId: 47, customAttributeValue: "Gold" },
];

/** @type {Array<{name:string,color:string,short:string,full:string,images:string[]}>} */
const PRODUCTS = [
  {
    name: "Altın Kaplama Deniz Kaplumbağası Figürlü Pastel Boncuklu Çelik Halhal",
    color: "Altın",
    short:
      "Lavanta deniz kaplumbağası figürü ve pastel mint boncuklarla yaz esintisi taşıyan altın kaplama çelik halhal. Ayarlanabilir zincir; plaj, sandalet ve yaz kombinlerine uyumlu.",
    full: `Merkezde kabuk detaylı lavanta tonlu deniz kaplumbağası figürü, iki yanında pastel mint-yeşil silindir boncuklar ve ince altın kaplama çelik zincir ile tamamlanır. Deniz kenarı, tatil ve bohem yaz stiline hafif ama dikkat çekici bir dokunuş katar.

316L paslanmaz çelik gövde kararmaya dayanıklıdır; ayarlanabilir uzatma zinciri sayesinde farklı ayak bileği ölçülerine kolayca uyum sağlar. İnce zincir yapısı ayakta kayganlık hissi vermeden konforlu durur.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal1_2_-b663bd9c-9f8d-4023-8bbc-a66c806320da.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal1-e5d9a3f3-fc17-4aa4-94b7-a1da43a5e65f.png",
    ],
  },
  {
    name: "Sedef Balık ve İnci Detaylı Turkuaz Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın",
    short:
      "Karşılıklı sedef balık figürleri, ortada inci detayı ve turkuaz-lavanta boncuklarla Akdeniz esintili altın kaplama çelik halhal. Yazlık plaj ve sandalet kombinlerine ideal.",
    full: `Ortada birbirine bakan iki sedef balık figürü arasında zarif bir inci detayı yer alır. Yanlarda turkuaz ve lavanta tonlu boncuk kümeleri, altın kaplama çelik spacer boncuklar ve ince link zincir ile deniz temalı bir bütünlük oluşturur.

316L paslanmaz çelik yapı suya dayanıklı ve hipoalerjeniktir. Ayarlanabilir klips + uzatma zinciri ile günlük plaj stilinden akşam yaz yemeğine kadar farklı kombinlerde kullanılabilir.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal2-b6129b6a-2b01-4034-927a-36ed134649c8.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal2_2_-e6a97777-fb61-41d8-bd1c-c067c01328f7.png",
    ],
  },
  {
    name: "Deniz Yıldızı Figürlü Turkuaz Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın",
    short:
      "Dokulu deniz yıldızı figürü, turkuaz oval ve mint silindir boncuklarla yaz plaj stiline uygun altın kaplama çelik halhal. Ayarlanabilir zincir, hafif ve zarif oturuş.",
    full: `Merkezde kabartmalı dokuya sahip altın renk deniz yıldızı figürü; iki yanında turkuaz fasetli oval boncuklar ve mint tonlu silindir boncukların simetrik dizilimiyle tamamlanır. Deniz, güneş ve tatil enerjisini ayak bileğinize taşır.

316L paslanmaz çelik zincir kararmaya dayanıklıdır. İnce profili ayakkabısız plaj yürüyüşlerinden espadril ve sandaletli kombinlere kadar geniş bir kullanım alanı sunar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal3-96b1b1d9-696e-4364-a425-69c481ee6a4b.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal3_2_-96a15f45-7865-488b-b7b6-cb7005d0881f.png",
    ],
  },
  {
    name: "Deniz Kabuğu ve İnci Detaylı Mavi Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın",
    short:
      "Üçlü istiridye deniz kabuğu figürü, fasetli mavi boncuklar ve inci detaylarıyla Akdeniz esintili altın kaplama çelik halhal. Yaz plaj takısı arayanlar için ideal.",
    full: `Zincir boyunca üç altın renk istiridye deniz kabuğu figürü; aralarında fasetli açık mavi boncuk kümeleri ve inci boncuk detayları yer alır. İnce altın kaplama çelik link zincir ve ayarlanabilir uzatma ile zarif, feminen bir yaz halhalı sunar.

316L paslanmaz çelik gövde günlük kullanımda konfor sağlar; deniz kabuğu ve inci kombinasyonu plaj, tatil ve bohem stile doğal bir uyum getirir.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal4_2_-1411c8e2-44f7-4a5d-921f-cc033b7bbea6.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal4-df05b3fb-1d9e-4d62-b25a-4ea22b35ca83.png",
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

async function fetchNextSkuStart(admin) {
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
  return max + 1;
}

async function uploadImages(admin, productId, imageFiles) {
  const urls = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const localPath = imageFiles[i];
    const bytes = fs.readFileSync(localPath);
    const storagePath = `products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: "image/png",
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
        listPrice: TY_PRICE,
        salePrice: TY_PRICE,
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
  if (!supabaseUrl || !serviceRole) throw new Error("Supabase env eksik");

  if (!fs.existsSync(ASSETS_DIR)) throw new Error(`Görsel klasörü yok: ${ASSETS_DIR}`);

  for (const item of PRODUCTS) {
    for (const f of item.images) {
      const p = path.join(ASSETS_DIR, f);
      if (!fs.existsSync(p)) throw new Error(`Görsel yok: ${p}`);
    }
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: category, error: catError } = await admin
    .from("categories")
    .select("id,slug")
    .eq("slug", "halhal")
    .maybeSingle();
  if (catError || !category?.id) throw new Error("Halhal kategorisi bulunamadı");

  const skuStart = await fetchNextSkuStart(admin);
  const results = [];

  let integration = null;
  if (!DRY_RUN && !SKIP_TY) {
    const { data, error } = await admin
      .from("marketplace_integrations")
      .select("id,environment,seller_id,api_key,api_secret,is_active")
      .eq("marketplace", "trendyol")
      .maybeSingle();
    if (!error && data?.is_active && data.api_key && data.api_secret) integration = data;
  }

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const item = PRODUCTS[i];
    const sku = `Zelula${skuStart + i}`;
    const slug = slugify(item.name);
    const imagePaths = item.images.map((f) => path.join(ASSETS_DIR, f));

    const payload = {
      name: item.name,
      slug,
      short_description: item.short,
      full_description: item.full,
      price: SITE_PRICE,
      compare_at_price: TY_PRICE,
      sku,
      stock_quantity: STOCK,
      featured: false,
      new_arrival: true,
      category_id: category.id,
      target_audience: "kadin",
      collection_id: null,
      material: "Paslanmaz Çelik",
      color: item.color,
      is_active: true,
      trendyol_barcode: sku,
      trendyol_stock_code: sku,
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
      results.push({ sku, slug, name: item.name, images: imagePaths.length });
      continue;
    }

    const { data: inserted, error: insertError } = await admin
      .from("products")
      .insert(payload)
      .select("id,sku,slug,name,full_description")
      .maybeSingle();
    if (insertError || !inserted?.id) {
      throw new Error(`${sku} eklenemedi: ${insertError?.message ?? "unknown"}`);
    }

    const imageUrls = await uploadImages(admin, inserted.id, imagePaths);
    console.log(`✓ DB: ${inserted.sku} — ${inserted.name}`);
    console.log(`  /urunler/${inserted.slug}`);

    let trendyol = { skipped: true };
    if (integration) {
      trendyol = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls);
      console.log(`${trendyol.ok ? "✓" : "✗"} Trendyol — HTTP ${trendyol.httpStatus} — batch: ${trendyol.batchRequestId ?? "yok"}`);
    }

    results.push({
      ok: true,
      sku: inserted.sku,
      slug: inserted.slug,
      url: `/urunler/${inserted.slug}`,
      price: SITE_PRICE,
      stock: STOCK,
      trendyol,
    });
  }

  console.log("\n" + JSON.stringify({ dryRun: DRY_RUN, skuStart, count: results.length, results }, null, 2));
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
