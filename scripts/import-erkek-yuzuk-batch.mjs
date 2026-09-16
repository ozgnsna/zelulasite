/**
 * 13 erkek çelik yüzük ürününü Supabase'e ekler (görsel yükleme + varyant 10/11).
 *
 *   node scripts/import-erkek-yuzuk-batch.mjs
 *   node scripts/import-erkek-yuzuk-batch.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BUCKET = "product-images";
const ASSETS_DIR =
  process.env.ERKEK_YUZUK_ASSETS_DIR ??
  path.resolve(
    process.env.USERPROFILE ?? "",
    ".cursor/projects/c-Users-ozgun-zelulasite/assets",
  );

const DRY_RUN = process.argv.includes("--dry-run");

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

const COMMON_FOOTER = `Özellikler:

Materyal: 316L paslanmaz çelik (hipoalerjenik, kararmaz)
Ölçü seçenekleri: 10 ve 11 numara
Kargo: Ücretsiz ve sigortalı gönderim
İade: 14 gün koşulsuz ücretsiz iade
Özel hediye kutusunda gönderilir`;

/** @type {Array<{image: string, name: string, color: string, short: string, full: string}>} */
const PRODUCTS = [
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_3-5f091687-8109-472a-a93d-c0ada1d3b0cb.png",
    name: "Meander Edge Çelik Erkek Yüzük",
    color: "Gümüş/Siyah",
    short:
      "Parlak gümüş kenarlarla çevrili siyah Yunan anahtarı desenli geniş profilli çelik erkek yüzük. Klasik motif ile modern çizgileri bir araya getirir.",
    full: `Antik Yunan anahtarı (meander) motifi, parlak gümüş rengi çelik kenarlar arasında siyah dolgu ile öne çıkar. Geniş bant profili maskülen bir duruş sunar; düz yüzeyi ve kontrastlı deseniyle hem günlük hem şık kombinlere uyum sağlar.

316L paslanmaz çelik gövde kararmaz, paslanmaya dayanıklıdır ve uzun süre ilk günkü parlaklığını korur.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_5-c3531f2d-d0b8-40c6-9aea-ba2d48e517bb.png",
    name: "Carbon Pulse Çelik Erkek Yüzük",
    color: "Gümüş/Siyah",
    short:
      "Orta şeridinde karbon fiber dokulu siyah inlay bulunan, eğimli kenarlı parlak gümüş çelik erkek yüzük. Sportif ve modern bir görünüm sunar.",
    full: `Orta bantta siyah karbon fiber dokusu, iki yanda parlak gümüş rengi çelik çerçeve ile çevrelenmiştir. Eğimli (bevel) kenar profili yüzüğe dinamik ve çağdaş bir karakter kazandırır.

Dayanıklı 316L paslanmaz çelik yapısı günlük kullanımda konfor ve uzun ömür sağlar; karbon fiber detayı teknik ve sportif bir estetik sunar.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_4-6faa86ae-7bc2-4fc2-a380-be91264cb26c.png",
    name: "Cable Lock Çelik Erkek Yüzük",
    color: "Gümüş",
    short:
      "Merkezinde burgulu çelik halat detayı ve üçlü boğum klipsleriyle endüstriyel çizgiler taşıyan parlak gümüş erkek yüzük.",
    full: `Orta kanalda burgulu tel (halat) figürü, düzenli aralıklarla yerleştirilmiş üçlü boğum metal klipslerle sabitlenmiş endüstriyel bir tasarım sunar. Parlak gümüş rengi yüzey, mekanik detaylarla güçlü ve maskülen bir duruş oluşturur.

316L paslanmaz çelikten üretilen gövde kararmaz; halat ve klips detayları yüzüğe derinlik ve karakter katar.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_6-58661ecf-ccc6-4bf3-9a86-e641679e0df4.png",
    name: "Urban Grid Meander Çelik Erkek Yüzük",
    color: "Siyah/Gümüş",
    short:
      "Parlak siyah gövde üzerinde gümüş şeritte Yunan anahtarı ve kare doku deseninin bir arada olduğu çift dokulu erkek yüzük.",
    full: `Glossy siyah çelik bant, ortadaki gümüş renkli dekoratif şeritte iki farklı deseni yan yana sunar: klasik Yunan anahtarı (meander) ve üç sıralı kare kabartma (grid) dokusu. Yüksek kontrastlı iki tonlu tasarım, mimari ve cesur bir görünüm yaratır.

316L paslanmaz çelik yapı günlük kullanıma uygundur; siyah ve gümüş kombinasyonu modern erkek stiline güçlü bir tamamlayıcıdır.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_8-eabd01f4-2d04-4d66-8f16-20bad854f921.png",
    name: "Double Meander Çelik Erkek Yüzük",
    color: "Gümüş/Siyah",
    short:
      "İki paralel siyah Yunan anahtarı şeridi ve ortada parlak gümüş bantla çevrili, yan yüzeylere taşan detaylı çelik erkek yüzük.",
    full: `Üst yüzeyde iki paralel siyah Yunan anahtarı bandı, ortada pürüzsüz parlak gümüş şerit ile ayrılır. Desen yan yüzeylere (rim) de uzanarak 360° bütünlüklü bir görünüm sağlar. Kalın ve tok profiliyle klasik motif modern bir yorumla sunulur.

316L paslanmaz çelikten üretilir; siyah dolgulu oyma detaylar uzun süre solmaya dayanıklıdır.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_7-9aaab74b-f3e1-4cdf-916d-412b9598cffa.png",
    name: "Trinity Facet Çelik Erkek Yüzük",
    color: "Gümüş/Siyah/Altın",
    short:
      "Piramit dokulu siyah bant, altın renkli facet şerit ve parlak gümüş kenarlarla üç tonlu premium erkek yüzük.",
    full: `Üç katmanlı tasarım: dış kenarlarda parlak gümüş çelik, ortada geometrik piramit (diamond-cut) dokulu siyah bant ve yanında altın renkli çok yüzeyli şerit. Mimari derinlik ve lüks kontrast bir arada sunulur.

316L paslanmaz çelik gövde kararmaz; üç renk tonu sayesinde hem günlük hem özel kombinlerde dikkat çekici bir parça olur.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_9-9013dd9e-700e-4b0d-9406-9b94142695af.png",
    name: "Chrono Link Çelik Erkek Yüzük",
    color: "Gümüş",
    short:
      "Orta şeridinde saat kordonu (link) deseni bulunan, kenarları parlak gümüş çelik erkek yüzük. Mekanik ve şık bir duruş sunar.",
    full: `Orta bölümde iki sıra interlocking link (saat kordonu) dokusu, düz parlak gümüş kenarlarla çerçevelenmiştir. Tekstürlü merkez ile ayna parlaklığındaki kenarlar arasındaki kontrast, premium ve maskülen bir görünüm oluşturur.

316L paslanmaz çelik yapı günlük kullanımda dayanıklılık sağlar; saat kordonu detayı endüstriyel şıklığı yansıtır.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_10-f4b48e1c-08e2-48b6-98b1-844599897993.png",
    name: "Shadow Braid Çelik Erkek Yüzük",
    color: "Siyah",
    short:
      "Mat siyah çelik gövde üzerinde dikdörtgen plakada üç sıra örgü kablo detayı ve perçin aksanlı endüstriyel erkek yüzük.",
    full: `Mat siyah kaplamalı geniş bant, üst yüzeyde dikdörtgen plaka içinde üç paralel örgü kablo (braid) dokusu sunar. Omuzlarda perçin/vida başı detayları endüstriyel ve mekanik bir estetik tamamlar.

316L paslanmaz çelikten üretilir; mat siyah yüzey cesur ve çağdaş bir tarz arayanlar için idealdir.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_13_kopya-0887d1a1-b62a-48f8-a861-0d69b54f2b27.png",
    name: "Gold Rail Çelik Erkek Yüzük",
    color: "Siyah/Altın",
    short:
      "Parlak siyah bant üzerinde üç altın renkli ray ve aralarında ince kablo dokulu detaylarla endüstriyel erkek yüzük.",
    full: `Glossy siyah çelik gövde, üst plakada üç paralel altın renkli ray ile öne çıkar. Raylar arasında ince siyah kablo/tel dokusu ve yanlarda perçin detayları mekanik bir karakter kazandırır.

316L paslanmaz çelik yapı kararmaya dayanıklıdır; siyah-altın kontrastı güçlü ve modern bir maskülen görünüm sunar.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_15-1c12b88f-f65e-4522-8f3f-22464a11a091.png",
    name: "Steel Plate Çelik Erkek Yüzük",
    color: "Siyah/Gümüş",
    short:
      "Örgü kablo dokulu siyah bant, ortadan geçen gümüş şerit ve üstte parlak siyah plaka ile endüstriyel erkek yüzük.",
    full: `Siyah çelik bantta örgü tel dokusu, ortadan parlak gümüş renkli ince şerit ile kesilir. Üst kısımda ayna parlaklığında siyah dikdörtgen plaka tasarımı tamamlayıcı bir vurgu oluşturur.

316L paslanmaz çelikten üretilir; çok dokulu yapısı endüstriyel şıklığı günlük kullanıma taşır.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_12-fabbe305-a03e-4f2e-ab33-2e6dac0acd7a.png",
    name: "Carbon Signet Çelik Erkek Yüzük",
    color: "Gümüş/Siyah",
    short:
      "Kare mühür formunda, üst yüzeyde siyah karbon fiber dokulu inlay bulunan parlak gümüş çelik erkek yüzük.",
    full: `Klasik mühür (signet) formunun modern yorumu: kare, yumuşak köşeli üst yüzeyde siyah karbon fiber örgü dokusu; geniş ve hafifçe daralan bant profili ile dengeli bir duruş.

316L paslanmaz çelik gövde parlak gümüş kaplamalıdır; karbon fiber detayı teknik ve sofistike bir kontrast yaratır.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_14-d7f2913f-abb0-4650-baa8-286c3a674b73.png",
    name: "Royal Signet Çelik Erkek Yüzük",
    color: "Gümüş/Siyah/Altın",
    short:
      "Yuvarlak karbon fiber mühür yüzeyi, yanlarda altın rengi amblem ve boncuk detaylı süslü çelik erkek yüzük.",
    full: `Dairesel mühür yüzeyinde mikro kare/karbon fiber dokulu siyah inlay; yan omuzlarda siyah zemin üzerinde altın renkli amblem figürü ve dikey boncuk (bead) sırası ile süslü detaylar. Geleneksel mühür estetiği modern malzemelerle buluşur.

316L paslanmaz çelik yapı dayanıklı ve hipoalerjeniktir; üç tonlu gümüş-siyah-altın paleti premium bir görünüm sunar.

${COMMON_FOOTER}`,
  },
  {
    image: "c__Users_ozgun_AppData_Roaming_Cursor_User_workspaceStorage_420a7a4f1dbc57494cb0d50a403fc873_images_11-0cffb89f-9322-42b8-8b37-7f2cea754821.png",
    name: "Forge Maze Çelik Erkek Yüzük",
    color: "Gümüş/Siyah",
    short:
      "Gümüş çelik çerçeve, siyah labirent dokulu merkez ve perçin detaylı endüstriyel geometrik erkek yüzük.",
    full: `Dikdörtgen üst yüzeyde gümüş renkli çelik çerçeve, ortada siyah zemin üzerine kabartma labirent/geometrik desen. Yanlarda çift perçin (rivet) detayları endüstriyel ve mekanik bir estetik sunar; iç yüzey konforlu mat siyah bitişlidir.

316L paslanmaz çelikten üretilir; geometrik desen ve iki tonlu yapı cesur, çağdaş erkek stiline uygundur.

${COMMON_FOOTER}`,
  },
];

async function fetchNextSkuStart(admin) {
  const values = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("products")
      .select("sku,trendyol_barcode")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const row of batch) {
      if (row.sku) values.push(String(row.sku));
      if (row.trendyol_barcode) values.push(String(row.trendyol_barcode));
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  let max = 0;
  for (const v of values) {
    const n = parseZelula(v);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}

async function uploadProductImage(admin, productId, localPath) {
  const bytes = fs.readFileSync(localPath);
  const storagePath = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) throw new Error(`Görsel yüklenemedi: ${uploadError.message}`);
  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  const { error: insertError } = await admin.from("product_images").insert({
    product_id: productId,
    image_url: data.publicUrl,
    is_cover: true,
    sort_order: 0,
  });
  if (insertError) throw new Error(`Görsel kaydı eklenemedi: ${insertError.message}`);
  return data.publicUrl;
}

async function run() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(`Görsel klasörü bulunamadı: ${ASSETS_DIR}`);
  }

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: category, error: catError } = await admin
    .from("categories")
    .select("id,name,slug")
    .eq("slug", "yuzuk")
    .maybeSingle();
  if (catError || !category?.id) {
    throw new Error(`Yüzük kategorisi bulunamadı: ${catError?.message ?? "yok"}`);
  }

  const skuStart = await fetchNextSkuStart(admin);
  const results = [];

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const item = PRODUCTS[i];
    const skuNum = skuStart + i;
    const sku = `Zelula${skuNum}`;
    const slug = slugify(item.name);
    const imagePath = path.join(ASSETS_DIR, item.image);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Görsel dosyası yok: ${imagePath}`);
    }

    const payload = {
      name: item.name,
      slug,
      short_description: item.short,
      full_description: item.full,
      price: 899,
      compare_at_price: 999,
      sku,
      stock_quantity: 2,
      featured: false,
      new_arrival: true,
      category_id: category.id,
      target_audience: "erkek",
      collection_id: null,
      material: "Çelik",
      color: item.color,
      is_active: true,
      trendyol_barcode: sku,
      trendyol_stock_code: sku,
      trendyol_active: false,
    };

    if (DRY_RUN) {
      results.push({ sku, slug, name: item.name, color: item.color, image: item.image });
      continue;
    }

    const { data: existing } = await admin.from("products").select("id,sku").eq("sku", sku).maybeSingle();
    let productId = existing?.id ?? null;

    if (productId) {
      const { error: updateError } = await admin.from("products").update(payload).eq("id", productId);
      if (updateError) throw new Error(`${sku} güncellenemedi: ${updateError.message}`);
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("products")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (insertError || !inserted?.id) {
        throw new Error(`${sku} eklenemedi: ${insertError?.message ?? "unknown"}`);
      }
      productId = inserted.id;
    }

    await admin.from("product_variants").delete().eq("product_id", productId);
    const { error: variantError } = await admin.from("product_variants").insert([
      { product_id: productId, label: "10", stock_quantity: 1, sort_order: 0, is_active: true },
      { product_id: productId, label: "11", stock_quantity: 1, sort_order: 1, is_active: true },
    ]);
    if (variantError) throw new Error(`${sku} varyant eklenemedi: ${variantError.message}`);

    await admin.from("product_images").delete().eq("product_id", productId);
    const imageUrl = await uploadProductImage(admin, productId, imagePath);

    results.push({
      ok: true,
      sku,
      slug,
      name: item.name,
      productId,
      color: item.color,
      imageUrl,
    });
    console.log(`✓ ${sku} — ${item.name}`);
  }

  console.log("\n" + JSON.stringify({ dryRun: DRY_RUN, skuStart, count: results.length, results }, null, 2));
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
