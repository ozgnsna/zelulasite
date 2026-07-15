/**
 * Ana sayfa kategori kartlarını bu haftanın ürün görselleriyle senkronlar.
 *   node scripts/sync-home-category-spotlights.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SLUGS = ["kolye", "kupe", "bileklik", "yuzuk"];

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

function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.floor((d.getTime() - yearStart.getTime()) / 604_800_000) + 1;
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function pickWeeklySpotlightIndex(weekKey, categorySlug, count) {
  if (count <= 0) return 0;
  let hash = 0;
  for (const ch of `${weekKey}:${categorySlug}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}

function sortImages(imgs) {
  const list = Array.isArray(imgs) ? imgs : imgs ? [imgs] : [];
  return [...list].sort((a, b) => {
    if (Boolean(a.is_cover) !== Boolean(b.is_cover)) return a.is_cover ? -1 : 1;
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
}

function pickCover(imgs) {
  const sorted = sortImages(imgs);
  const row = sorted.find((r) => String(r.image_url ?? "").trim());
  return String(row?.image_url ?? "").trim();
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const weekKey = getIsoWeekKey();
const { data: categories } = await admin.from("categories").select("id,name,slug,image_url").in("slug", SLUGS);
const categoryBySlug = new Map((categories ?? []).map((c) => [c.slug, c]));
const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
const categoryIds = (categories ?? []).map((c) => c.id);

const { data: products } = await admin
  .from("products")
  .select("id,name,slug,category_id,product_images(image_url,is_cover,sort_order)")
  .in("category_id", categoryIds)
  .eq("is_active", true)
  .gt("stock_quantity", 0);

const grouped = new Map(SLUGS.map((slug) => [slug, []]));
for (const product of products ?? []) {
  const category = categoryById.get(product.category_id);
  const slug = category?.slug;
  if (!slug || !grouped.has(slug)) continue;
  const image = pickCover(product.product_images);
  if (!image) continue;
  grouped.get(slug).push({ ...product, image });
}

for (const slug of SLUGS) {
  grouped.set(
    slug,
    grouped.get(slug).sort((a, b) => a.id.localeCompare(b.id)),
  );
}

const updated = [];
for (const slug of SLUGS) {
  const pool = grouped.get(slug);
  const index = pickWeeklySpotlightIndex(weekKey, slug, pool.length);
  const picked = pool[index] ?? null;
  const image = picked?.image ?? String(categoryBySlug.get(slug)?.image_url ?? "").trim();
  if (!image) continue;

  const categoryId = categoryBySlug.get(slug)?.id;
  if (!categoryId) continue;

  const { error } = await admin.from("categories").update({ image_url: image }).eq("id", categoryId);
  if (error) throw error;

  updated.push({
    slug,
    productId: picked?.id ?? null,
    productName: picked?.name ?? null,
    image,
  });
}

console.log(JSON.stringify({ weekKey, updated }, null, 2));
