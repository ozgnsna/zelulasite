import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Seed komutu `node` ile çalıştığı için .env dosyalarını kendimiz yüklüyoruz.
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Seed için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const categories = [
  { name: "Kolye", slug: "kolye" },
  { name: "Küpe", slug: "kupe" },
  { name: "Yüzük", slug: "yuzuk" },
  { name: "Bileklik", slug: "bileklik" },
  { name: "Bilezik", slug: "bilezik" },
  { name: "Halhal", slug: "halhal" },
  { name: "Şahmeran", slug: "sahmeran" },
  { name: "Aksesuar", slug: "aksesuar" },
];

const collections = [
  {
    name: "Aura",
    slug: "aura",
    description: "Işığı yumuşak dokunuşla buluşturan modern çizgiler",
  },
  {
    name: "Noir",
    slug: "noir",
    description: "Gece şıklığına eşlik eden güçlü ve rafine parçalar",
  },
  {
    name: "Daily Glow",
    slug: "daily-glow",
    description: "Günlük kombinlere premium ama sade bir ışıltı",
  },
];

const products = [
  {
    name: "Luna Drop Küpe",
    slug: "luna-drop-kupe",
    short_description: "Günlük ışıltını tamamlayan zarif form",
    full_description:
      "Antialerjik yapıda, gün boyu hafif kullanım için tasarlandı. Günlük stil ve akşam kombinlerinde dengeli bir parlaklık sunar.",
    price: 899,
    compare_at_price: 1099,
    sku: "ZL-KP-001",
    stock_quantity: 38,
    featured: true,
    new_arrival: true,
    category_slug: "kupe",
    collection_slug: "aura",
    material: "Çelik üzeri premium kaplama",
    color: "Rose Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Nara Halka Küpe",
    slug: "nara-halka-kupe",
    short_description: "Minimal halka, modern dokunuş",
    full_description:
      "Şehir temposuna uyumlu, zamansız bir tasarım. Hafif gövdesiyle gün boyu konfor sağlar.",
    price: 749,
    compare_at_price: null,
    sku: "ZL-KP-002",
    stock_quantity: 41,
    featured: true,
    new_arrival: false,
    category_slug: "kupe",
    collection_slug: "daily-glow",
    material: "Paslanmaz çelik",
    color: "Champagne",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Mira Taşlı Kolye",
    slug: "mira-tasli-kolye",
    short_description: "Boyun hattını vurgulayan ince zincir",
    full_description:
      "Katmanlı kullanım için ideal uzunluk. Işığı yumuşak yansıtan taş detaylarıyla feminen bir görünüm sunar.",
    price: 1199,
    compare_at_price: 1399,
    sku: "ZL-KL-003",
    stock_quantity: 24,
    featured: true,
    new_arrival: true,
    category_slug: "kolye",
    collection_slug: "aura",
    material: "Premium alaşım",
    color: "Rose Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Liora Kolye",
    slug: "liora-kolye",
    short_description: "Tek taş etkisiyle sade bir ifade",
    full_description:
      "Özel gün ve günlük kombinlerde dengeli görünüm. İnce zincir yapısı sayesinde katmanlı stile uyumludur.",
    price: 999,
    compare_at_price: null,
    sku: "ZL-KL-004",
    stock_quantity: 18,
    featured: false,
    new_arrival: true,
    category_slug: "kolye",
    collection_slug: "noir",
    material: "Çelik",
    color: "Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Eterna Yüzük",
    slug: "eterna-yuzuk",
    short_description: "Zamansız yüzük formu",
    full_description:
      "Farklı ölçülerde konforlu iç yüzey. Günlük kullanıma uygun çizik dirençli kaplama ile sunulur.",
    price: 1099,
    compare_at_price: 1299,
    sku: "ZL-YZ-005",
    stock_quantity: 30,
    featured: true,
    new_arrival: false,
    category_slug: "yuzuk",
    collection_slug: "aura",
    material: "Antialerjik alaşım",
    color: "Silver",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/265906/pexels-photo-265906.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Nova Yüzük",
    slug: "nova-yuzuk",
    short_description: "Modern çizgili minimal yüzük",
    full_description:
      "Günlük kullanım için dayanıklı gövde. İnce formu sayesinde diğer yüzüklerle kombinlenebilir.",
    price: 799,
    compare_at_price: null,
    sku: "ZL-YZ-006",
    stock_quantity: 27,
    featured: false,
    new_arrival: true,
    category_slug: "yuzuk",
    collection_slug: "daily-glow",
    material: "Paslanmaz çelik",
    color: "Rose Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/5370707/pexels-photo-5370707.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Sera Bileklik",
    slug: "sera-bileklik",
    short_description: "İnce zincirli şık bileklik",
    full_description:
      "Katmanlı takı kullanımına uygun. Hafif yapısı ile gün boyu konforlu şekilde taşınır.",
    price: 699,
    compare_at_price: 899,
    sku: "ZL-BL-007",
    stock_quantity: 50,
    featured: true,
    new_arrival: true,
    category_slug: "bileklik",
    collection_slug: "daily-glow",
    material: "Çelik",
    color: "Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/5370704/pexels-photo-5370704.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Aria Bileklik",
    slug: "aria-bileklik",
    short_description: "Yumuşak parlaklıkta premium doku",
    full_description:
      "Hafif ve konforlu günlük parça. Tek başına veya saat ile birlikte modern bir görünüm sunar.",
    price: 759,
    compare_at_price: null,
    sku: "ZL-BL-008",
    stock_quantity: 45,
    featured: false,
    new_arrival: false,
    category_slug: "bileklik",
    collection_slug: "aura",
    material: "Alaşım",
    color: "Champagne",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/1454174/pexels-photo-1454174.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Noir Halo Küpe",
    slug: "noir-halo-kupe",
    short_description: "Akşam stiline güçlü vurgu",
    full_description:
      "Işığı taşıyan net form. Gece kombinlerine sofistike bir denge katar.",
    price: 849,
    compare_at_price: null,
    sku: "ZL-KP-009",
    stock_quantity: 29,
    featured: true,
    new_arrival: false,
    category_slug: "kupe",
    collection_slug: "noir",
    material: "Çelik",
    color: "Black Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/1454172/pexels-photo-1454172.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Petra Kolye",
    slug: "petra-kolye",
    short_description: "Editoryal görünümlü zarif hat",
    full_description:
      "Özel kutu ile gönderim. İnce formu sayesinde klasik ve modern kombinlerde kolayca kullanılabilir.",
    price: 1249,
    compare_at_price: 1499,
    sku: "ZL-KL-010",
    stock_quantity: 20,
    featured: false,
    new_arrival: true,
    category_slug: "kolye",
    collection_slug: "noir",
    material: "Premium alaşım",
    color: "Rose Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/1454173/pexels-photo-1454173.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Mina Yüzük",
    slug: "mina-yuzuk",
    short_description: "Günlük kombinlere modern eşlik",
    full_description:
      "İnce ve zarif profil. İster tek başına ister stack stilinde kullanılabilir.",
    price: 689,
    compare_at_price: null,
    sku: "ZL-YZ-011",
    stock_quantity: 33,
    featured: false,
    new_arrival: true,
    category_slug: "yuzuk",
    collection_slug: "daily-glow",
    material: "Çelik",
    color: "Silver",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Lume Bileklik",
    slug: "lume-bileklik",
    short_description: "Yumuşak tonlarda feminen parıltı",
    full_description:
      "Hediye kutusu ile premium sunum. Günlük stilde kolayca öne çıkan zarif bir bileklik.",
    price: 939,
    compare_at_price: 1099,
    sku: "ZL-BL-012",
    stock_quantity: 26,
    featured: true,
    new_arrival: true,
    category_slug: "bileklik",
    collection_slug: "aura",
    material: "Antialerjik alaşım",
    color: "Rose Gold",
    is_active: true,
    image_url:
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    name: "Aquarius (Kova Burcu) Gold Renk Çelik Kolye",
    slug: "aquarius-kova-burcu-gold-celik-kolye",
    short_description: "Özgün ruhunuzu ve geleceğin enerjisini boynunuzda taşıyın.",
    full_description: `Özgün ruhunuzu ve geleceğin enerjisini boynunuzda taşıyın!

Zodyak'ın en yenilikçi, entelektüel ve özgür ruhlu burcu olan Kova'nın vizyoner enerjisini yansıtan bu özel tasarım kolye, stilinize modern bir dokunuş katacak. Hem sıra dışı kişiliğinizi vurgulayan bir imza parça hem de sınır tanımayan sevdikleriniz için eşsiz bir hediye seçeneği.

Öne çıkan özellikler

Materyal: Yüksek kaliteli 316L cerrahi çelikten üretilmiştir. Kararma yapmaz, paslanmaz ve en hareketli günlerde bile parlaklığını yitirmez.

Renk: Altın (gold) rengi kaplama; sıcak ve rafine bir parlaklık sunar, Kova burcunun fütüristik ve özgün çizgisiyle uyumludur.

Tasarım: Oval madalyon formunda; üzerinde Kova burcunun (Aquarius) toplumsal zekâyı, paylaşımı ve yenilikçi yapısını simgeleyen estetik işleme yer alır.

Cilt dostu: Antialerjenik yapısı sayesinde hassas ciltlerde bile güvenle kullanılabilir; gün boyu konforlu taşınır.

Ürün bilgileri

Zincir uzunluğu: Standart 45 cm + 5 cm uzatma payı (ayarlanabilir, farklı yaka tiplerine uyumlu).

Kolye ucu: Modern, minimalist oval plaka.

Neden bu kolye?

Kalıplara sığmayan Kovaların bağımsız ruhunu simgeleyen bu kolye, şıklığı ve anlamı bir araya getirir. Zelula kalitesiyle hazırlanan bu özel seri, şık kutusuyla hediye sunumuna hazır şekilde ulaşır.

Bakım notu: İlk günkü ışıltıyı korumak için yoğun kimyasal (parfüm, çamaşır suyu vb.) temasından kaçınmanız önerilir.`,
    price: 1399,
    compare_at_price: 1599,
    sku: "ZL-KL-013",
    stock_quantity: 22,
    featured: true,
    new_arrival: true,
    category_slug: "kolye",
    collection_slug: "aura",
    material: "316L cerrahi çelik",
    color: "Gold",
    is_active: true,
    image_url: "/products/aquarius-kova-gold-celik-kolye.png",
  },
];

async function run() {
  console.log("Seeding categories...");
  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "slug" });
  if (catErr) throw catErr;

  console.log("Seeding collections...");
  const { error: colErr } = await supabase
    .from("collections")
    .upsert(collections, { onConflict: "slug" });
  if (colErr) throw colErr;

  const [{ data: dbCategories, error: dbCatErr }, { data: dbCollections, error: dbColErr }] =
    await Promise.all([
      supabase.from("categories").select("id,slug"),
      supabase.from("collections").select("id,slug"),
    ]);
  if (dbCatErr) throw dbCatErr;
  if (dbColErr) throw dbColErr;

  const catBySlug = new Map((dbCategories ?? []).map((x) => [x.slug, x.id]));
  const colBySlug = new Map((dbCollections ?? []).map((x) => [x.slug, x.id]));

  const productRows = products.map((p) => ({
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    full_description: p.full_description,
    price: p.price,
    compare_at_price: p.compare_at_price,
    sku: p.sku,
    stock_quantity: p.stock_quantity,
    featured: p.featured,
    new_arrival: p.new_arrival,
    category_id: catBySlug.get(p.category_slug) ?? null,
    collection_id: colBySlug.get(p.collection_slug) ?? null,
    material: p.material,
    color: p.color,
    is_active: p.is_active,
  }));

  console.log("Seeding products...");
  const { error: prodErr } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "slug" });
  if (prodErr) throw prodErr;

  const { data: dbProducts, error: dbProdErr } = await supabase
    .from("products")
    .select("id,slug");
  if (dbProdErr) throw dbProdErr;
  const productIds = (dbProducts ?? []).map((x) => x.id);

  if (productIds.length > 0) {
    console.log("Refreshing product images...");
    const { error: delImgErr } = await supabase
      .from("product_images")
      .delete()
      .in("product_id", productIds);
    if (delImgErr) throw delImgErr;
  }

  const imageRows = products
    .map((p, idx) => {
      const db = (dbProducts ?? []).find((x) => x.slug === p.slug);
      if (!db) return null;
      return {
        product_id: db.id,
        image_url: p.image_url,
        is_cover: true,
        sort_order: idx,
      };
    })
    .filter(Boolean);

  if (imageRows.length > 0) {
    const { error: imgErr } = await supabase.from("product_images").insert(imageRows);
    if (imgErr) throw imgErr;
  }

  console.log("Seed complete.");
}

run().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
