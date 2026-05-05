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
    .slice(0, 56);
}

async function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, "..");
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const permalink = "https://www.instagram.com/p/DXmuv2LClFu/?img_index=1";
  const productName = "Kristal Taşlı Papağan Model Büyük Boy Küpe";
  const slug = `${slugify(productName)}-ig`;
  const sku = `IG-DXmuv2LClFu`;
  const shortDescription = "Instagram koleksiyonundan öne çıkan tropikal dokulu özel tasarım küpe.";
  const fullDescription =
    "Özel Tasarım Kristal Taşlı Papağan Model Egzotik Büyük Boy Küpe. Tarzına tropikal bir dokunuş katmak için tasarlandı.\n\nKaynak gönderi: " +
    permalink;

  const [{ data: category }, { data: collection }] = await Promise.all([
    supabase.from("categories").select("id").ilike("name", "%küpe%").limit(1).maybeSingle(),
    supabase.from("collections").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(
      {
        name: productName,
        slug,
        short_description: shortDescription,
        full_description: fullDescription,
        price: 1499,
        compare_at_price: 1799,
        sku,
        stock_quantity: 8,
        featured: true,
        new_arrival: true,
        category_id: category?.id ?? null,
        collection_id: collection?.id ?? null,
        material: "Çelik üzeri premium kaplama",
        color: "Gold",
        is_active: true,
        trendyol_active: false,
        trendyol_brand: "Zelula",
      },
      { onConflict: "slug" },
    )
    .select("id,name,slug")
    .maybeSingle();

  if (productError || !product?.id) {
    throw new Error(`Ürün kaydedilemedi: ${productError?.message ?? "unknown error"}`);
  }

  await supabase.from("product_images").delete().eq("product_id", product.id);
  const { error: imageError } = await supabase.from("product_images").insert({
    product_id: product.id,
    image_url: "/hero-luxury.png",
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
        permalink,
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
