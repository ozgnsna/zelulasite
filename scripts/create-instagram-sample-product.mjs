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

function slugify(input) {
  return String(input ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

function pickImageUrl(row) {
  if (row.media_type === "VIDEO") return row.thumbnail_url ?? row.media_url;
  if (row.media_type === "CAROUSEL_ALBUM") {
    const first = row.children?.data?.[0];
    if (!first) return row.media_url ?? row.thumbnail_url;
    return first.media_url ?? first.thumbnail_url;
  }
  return row.media_url ?? row.thumbnail_url;
}

async function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, "..");
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v21.0";

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!token || !userId) {
    throw new Error("Instagram env eksik: INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID");
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const mediaUrl = new URL(`https://graph.facebook.com/${graphVersion}/${userId}/media`);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}",
  );
  mediaUrl.searchParams.set("limit", "1");
  mediaUrl.searchParams.set("access_token", token);

  const mediaRes = await fetch(mediaUrl.toString(), { headers: { Accept: "application/json" } });
  const mediaJson = await mediaRes.json();
  if (!mediaRes.ok || mediaJson?.error) {
    throw new Error(
      `Instagram API hatası: ${mediaRes.status} ${JSON.stringify(mediaJson?.error ?? mediaJson)}`,
    );
  }

  const row = mediaJson?.data?.[0];
  if (!row) throw new Error("Instagram'dan ürün oluşturmak için gönderi bulunamadı.");

  const imageUrl = pickImageUrl(row);
  if (!imageUrl) throw new Error("Seçilen Instagram gönderisinde kullanılabilir görsel bulunamadı.");

  const caption = String(row.caption ?? "Instagram özel seçkisi").trim();
  const titleBase =
    caption
      .split("\n")[0]
      .replace(/[#@].*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 70) || "Instagram Özel Parça";
  const productName = titleBase;
  const slug = `${slugify(productName) || "instagram-urun"}-${String(row.id).slice(-6)}`;
  const sku = `IG-${String(row.id).slice(-10)}`;
  const nowIso = new Date().toISOString();

  const [{ data: category }, { data: collection }] = await Promise.all([
    supabase.from("categories").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("collections").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const shortDescription = "Instagram seçkisinden ilham alan, günlük kombinlere uyumlu özel parça.";
  const fullDescription = `${caption}\n\nKaynak: ${row.permalink ?? "Instagram gönderisi"}`;

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name: productName,
      slug,
      short_description: shortDescription,
      full_description: fullDescription,
      price: 1299,
      compare_at_price: 1499,
      sku,
      stock_quantity: 12,
      featured: true,
      new_arrival: true,
      category_id: category?.id ?? null,
      collection_id: collection?.id ?? null,
      material: "Çelik üzeri premium kaplama",
      color: "Gold",
      is_active: true,
      trendyol_active: false,
      created_at: nowIso,
      trendyol_barcode: null,
      trendyol_brand: "Zelula",
    })
    .select("id,name,slug")
    .maybeSingle();

  if (productError || !product?.id) {
    throw new Error(`Ürün kaydedilemedi: ${productError?.message ?? "unknown error"}`);
  }

  const { error: imageError } = await supabase.from("product_images").insert({
    product_id: product.id,
    image_url: imageUrl,
    is_cover: true,
    sort_order: 0,
  });
  if (imageError) {
    throw new Error(`Görsel kaydedilemedi: ${imageError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        instagramPostId: row.id,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
