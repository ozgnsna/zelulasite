/**
 * Halhal batch 2 (Zelula380–387) — 8 model, site 349₺ / TY 449₺.
 *   node scripts/import-halhal-batch-2.mjs
 *   node scripts/import-halhal-batch-2.mjs --dry-run
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

/** @type {Array<{slug:string,name:string,color:string,short:string,full:string,images:string[]}>} */
const PRODUCTS = [
  {
    slug: "mavi-boncuklu-balik-figurlu-celik-halhal",
    name: "Mavi Boncuklu Çizgili Balık Figürlü Altın Kaplama Çelik Halhal",
    color: "Altın/Mavi",
    short:
      "Açık mavi oval boncuklar ve mavi-beyaz çizgili balık figürüyle marin temalı altın kaplama çelik halhal. Ayarlanabilir zincir; plaj ve yaz kombinlerine uyumlu.",
    full: `İnce altın kaplama çelik zincir üzerinde açık mavi oval boncuklar ve ortada mavi-beyaz çizgili balık figürü yer alır. Deniz kenarı, tatil ve sandaletli kombinlerde hafif ama dikkat çekici bir yaz aksesuarı sunar.

316L paslanmaz çelik gövde kararmaya dayanıklıdır; ayarlanabilir uzatma zinciri farklı ayak bileği ölçülerine kolay uyum sağlar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal5-10686048-6252-4721-a91a-ea49a8d6107b.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal5_2_-5da76c96-6f9e-4e72-b8f4-70f992eec8f7.png",
    ],
  },
  {
    slug: "lila-deniz-kabugu-boncuklu-celik-halhal",
    name: "Lila Deniz Kabuğu ve İnci Detaylı Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Lila",
    short:
      "Lila mermer efektli deniz kabuğu figürü, inci ve turkuaz-lavanta boncuklarla bohem yaz stiline uygun altın kaplama çelik halhal.",
    full: `Merkezde lila tonlu mermer efektli deniz kabuğu figürü; yanlarda inci boncuklar, lavanta ve turkuaz fasetli boncuk kümeleri ile tamamlanır. Altın kaplama çelik paperclip zincir modern bir dokunuş katar.

316L paslanmaz çelik yapı hipoalerjeniktir; yaz plaj stili, espadril ve elbise kombinlerinde zarif bir tamamlayıcıdır.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal6-9b90e981-d090-4539-bb4f-398b0d8deb85.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal6_2_-3bfcbc00-7f47-48cd-a263-e9dbfe5583c7.png",
    ],
  },
  {
    slug: "kaplumbaga-inci-holograf-celik-halhal",
    name: "Deniz Kaplumbağası İnci ve Holograf Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Mavi",
    short:
      "Altın kaplumbağa figürü, inci boncuklar ve holograf boncuklarla tropikal yaz havası veren altın kaplama çelik halhal. Ayarlanabilir zincir.",
    full: `Ortada altın renk deniz kaplumbağası figürü; iki yanda turkuaz boncuklar, inci detayları ve gökkuşağı yansımalı holograf boncuklar yer alır. Deniz, güneş ve tatil enerjisini ayak bileğinize taşır.

316L paslanmaz çelik zincir kararmaya dayanıklıdır. Uzatma zinciri ve klips kapatma ile pratik kullanım sunar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal7-1abee844-9f14-4c17-9b97-900c9365c9b7.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal7_2_-f3c7c9e4-0585-4cd2-9b6a-d74fbf146704.png",
    ],
  },
  {
    slug: "nazar-balik-turkuaz-celik-halhal",
    name: "Nazar Balık Figürlü Turkuaz Tohum Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Turkuaz",
    short:
      "Nazar detaylı açık mavi balık figürü ve turkuaz tohum boncuklarla şans ve marin temalı altın kaplama çelik halhal. Ayarlanabilir zincir.",
    full: `Merkezde nazar boncuğu detaylı açık mavi balık figürü; iki yanda turkuaz tohum boncuk kümeleri ve ince altın kaplama çelik zincir ile tamamlanır. Akdeniz ve yaz plaj stiline hem şık hem anlamlı bir dokunuş katar.

316L paslanmaz çelik gövde günlük kullanımda dayanıklıdır; ayarlanabilir uzatma zinciri ile rahat oturuş sağlar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal8-a0a3b14f-f378-4cf4-8caf-d374583f13f0.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal8_2_-b7f10b31-aff2-4588-b4b8-7d0abe22bee7.png",
    ],
  },
  {
    slug: "sedef-yildiz-mavi-boncuklu-celik-halhal",
    name: "Sedef Yıldız Figürlü Mavi Ton Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Mavi",
    short:
      "Sedef yıldız figürü ve lavanta-turkuaz gradyan boncuklarla deniz esintili altın kaplama çelik halhal. Yaz plaj kombinlerine ideal.",
    full: `Ortada sedef görünümlü yıldız figürü; iki yanda lavanta, turkuaz ve açık mavi fasetli boncukların simetrik dizilimi yer alır. Altın kaplama çelik spacer boncuklar ve ince zincir zarif bir yaz halhalı oluşturur.

316L paslanmaz çelik yapı kararmaya dayanıklıdır; plaj elbisesi ve sandalet kombinlerinde hafif ışıltı katar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal9-e2d3915c-b3f7-43f7-bb1e-55010d0cce3c.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal9_2_-796dfb8d-de1b-46a8-8fec-0116f94e1843.png",
    ],
  },
  {
    slug: "spiral-deniz-kabugu-turkuaz-celik-halhal",
    name: "Spiral Deniz Kabuğu Turkuaz Taşlı Altın Kaplama Çelik Halhal",
    color: "Altın/Mavi",
    short:
      "Spiral deniz kabuğu figürü ve turkuaz-yeşil düz taş boncuklarla bohem yaz stiline uygun altın kaplama çelik halhal.",
    full: `Merkezde spiral kabuk desenli açık mavi deniz kabuğu figürü; yanlarda turkuaz ve deniz yeşili düz taş boncuklar, inci detayları ve altın kaplama spacer boncuklar yer alır. Ege ve Akdeniz esintili bir yaz takısı sunar.

316L paslanmaz çelik zincir ayarlanabilir; hafif yapısı gün boyu konforlu kullanım sağlar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal10-e8adc022-a56f-4971-b469-7b91797c9e28.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal10_2_-15c70cca-f064-4936-a34d-01594b739d91.png",
    ],
  },
  {
    slug: "uclu-istiridye-turkuaz-celik-halhal",
    name: "Üçlü İstiridye Kabuğu Turkuaz Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Beyaz",
    short:
      "Üç istiridye deniz kabuğu figürü ve turkuaz boncuklarla Akdeniz esintili altın kaplama çelik halhal. Yaz plaj stiline zarif tamamlayıcı.",
    full: `Zincir boyunca üç beyaz istiridye deniz kabuğu figürü; aralarında turkuaz boncuk kümeleri ve altın kaplama spacer detayları yer alır. Deniz kenarı, tekne turu ve yaz akşamüstü kombinlerinde hafif ışıltı katar.

316L paslanmaz çelik gövde kararmaya dayanıklıdır; ayarlanabilir zincir ile farklı bilek ölçülerine uyum sağlar.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal11_2_-e77fb214-f7eb-4958-8f7c-a3f4b1e54510.png",
    ],
  },
  {
    slug: "lavanta-yildiz-opal-celik-halhal",
    name: "Lavanta Yıldız Opal Boncuklu Altın Kaplama Çelik Halhal",
    color: "Altın/Lavanta",
    short:
      "Lavanta yıldız figürü ve opal ışıltılı silindir boncuklarla göksel yaz temalı altın kaplama çelik halhal. Minimal ve zarif.",
    full: `Merkezde lavanta tonlu yıldız figürü; iki yanda opal ışıltılı silindir boncuklar ve küçük altın kaplama spacer boncuklar simetrik dizilir. Göksel ve yaz esintili, feminen bir halhal tasarımı sunar.

316L paslanmaz çelik zincir ince profilli ve konforludur; ayarlanabilir klips ile günlük plaj stilinde kolay kullanım.

${COMMON_FOOTER}`,
    images: [
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal12-df83080f-3a1c-4749-a714-1bd96df62cb4.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal12_2_-55d2a263-f0fc-4274-b097-7c952975945a.png",
      "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_halhal12_3_-ce1ee3a6-02bf-4221-9220-3a8e3db48486.png",
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
    for (const row of data ?? []) {
      if (row.sku) values.push(String(row.sku));
      if (row.trendyol_barcode) values.push(String(row.trendyol_barcode));
    }
    if ((data ?? []).length < 1000) break;
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
    const bytes = fs.readFileSync(imageFiles[i]);
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

  return { ok: res.ok, httpStatus: res.status, batchRequestId, message };
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
    const { data } = await admin
      .from("marketplace_integrations")
      .select("id,environment,seller_id,api_key,api_secret,is_active")
      .eq("marketplace", "trendyol")
      .maybeSingle();
    if (data?.is_active && data.api_key && data.api_secret) integration = data;
  }

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const item = PRODUCTS[i];
    const sku = `Zelula${skuStart + i}`;
    const imagePaths = item.images.map((f) => path.join(ASSETS_DIR, f));

    const payload = {
      name: item.name,
      slug: item.slug,
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
      results.push({ sku, slug: item.slug, name: item.name, images: imagePaths.length });
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
    console.log(`✓ ${inserted.sku} — ${inserted.name}`);
    console.log(`  /urunler/${inserted.slug}`);

    let trendyol = { skipped: true };
    if (integration) {
      trendyol = await pushTrendyol(integration, admin, { ...inserted, ...payload }, imageUrls);
      console.log(`${trendyol.ok ? "✓" : "✗"} Trendyol — HTTP ${trendyol.httpStatus}`);
    }

    results.push({ ok: true, sku, slug: item.slug, price: SITE_PRICE, tyPrice: TY_PRICE, trendyol });
  }

  console.log("\n" + JSON.stringify({ dryRun: DRY_RUN, skuStart, count: results.length, results }, null, 2));
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
