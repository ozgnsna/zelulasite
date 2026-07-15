import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryHref } from "@/lib/categories/taxonomy";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";

export const HOME_SPOTLIGHT_CATEGORY_SLUGS = ["kolye", "kupe", "bileklik", "yuzuk"] as const;

export type HomeSpotlightCategorySlug = (typeof HOME_SPOTLIGHT_CATEGORY_SLUGS)[number];

export type HomeCategoryCard = {
  label: string;
  href: string;
  image: string;
  categorySlug: HomeSpotlightCategorySlug;
  productId: string | null;
  productName: string | null;
  weekKey: string;
};

type ProductImageRow = {
  image_url?: string | null;
  is_cover?: boolean | null;
  sort_order?: number | null;
};

type SpotlightProductRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  product_images: ProductImageRow[] | ProductImageRow | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
};

/** ISO hafta anahtarı — Pazartesi başlangıçlı haftada sabit kalır. */
export function getIsoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week =
    Math.floor((d.getTime() - yearStart.getTime()) / 604_800_000) + 1;
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Hafta + kategori için deterministik indeks (aynı hafta aynı ürün). */
export function pickWeeklySpotlightIndex(weekKey: string, categorySlug: string, count: number): number {
  if (count <= 0) return 0;
  let hash = 0;
  for (const ch of `${weekKey}:${categorySlug}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}

function stableProductSort(a: SpotlightProductRow, b: SpotlightProductRow): number {
  return a.id.localeCompare(b.id);
}

function groupEligibleProducts(
  products: SpotlightProductRow[],
  categoryById: Map<string, CategoryRow>,
): Map<HomeSpotlightCategorySlug, SpotlightProductRow[]> {
  const grouped = new Map<HomeSpotlightCategorySlug, SpotlightProductRow[]>();
  for (const slug of HOME_SPOTLIGHT_CATEGORY_SLUGS) {
    grouped.set(slug, []);
  }

  for (const product of products) {
    const category = categoryById.get(product.category_id);
    const slug = category?.slug as HomeSpotlightCategorySlug | undefined;
    if (!slug || !grouped.has(slug)) continue;

    const imageUrl = pickProductCoverImageUrl(
      Array.isArray(product.product_images)
        ? product.product_images
        : product.product_images
          ? [product.product_images]
          : [],
    );
    if (!imageUrl) continue;

    grouped.get(slug)!.push(product);
  }

  for (const [slug, list] of grouped) {
    grouped.set(slug, [...list].sort(stableProductSort));
  }

  return grouped;
}

export async function resolveHomeCategorySpotlights(
  supabase: SupabaseClient,
  weekKey = getIsoWeekKey(),
): Promise<HomeCategoryCard[]> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id,name,slug,image_url")
    .in("slug", [...HOME_SPOTLIGHT_CATEGORY_SLUGS]);

  if (catError) throw catError;

  const categoryBySlug = new Map<string, CategoryRow>();
  const categoryById = new Map<string, CategoryRow>();
  for (const row of categories ?? []) {
    categoryBySlug.set(row.slug, row);
    categoryById.set(row.id, row);
  }

  const categoryIds = (categories ?? []).map((c) => c.id);
  if (categoryIds.length === 0) {
    return HOME_SPOTLIGHT_CATEGORY_SLUGS.map((slug) => ({
      label: slug,
      href: categoryHref(slug),
      image: "",
      categorySlug: slug,
      productId: null,
      productName: null,
      weekKey,
    }));
  }

  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id,name,slug,category_id,product_images(image_url,is_cover,sort_order)")
    .in("category_id", categoryIds)
    .eq("is_active", true)
    .gt("stock_quantity", 0);

  if (prodError) throw prodError;

  const grouped = groupEligibleProducts((products ?? []) as SpotlightProductRow[], categoryById);

  return HOME_SPOTLIGHT_CATEGORY_SLUGS.map((slug) => {
    const category = categoryBySlug.get(slug);
    const pool = grouped.get(slug) ?? [];
    const index = pickWeeklySpotlightIndex(weekKey, slug, pool.length);
    const picked = pool[index] ?? null;
    const image = picked
      ? pickProductCoverImageUrl(
          Array.isArray(picked.product_images)
            ? picked.product_images
            : picked.product_images
              ? [picked.product_images]
              : [],
        )
      : String(category?.image_url ?? "").trim();

    return {
      label: category?.name ?? slug,
      href: categoryHref(slug),
      image,
      categorySlug: slug,
      productId: picked?.id ?? null,
      productName: picked?.name ?? null,
      weekKey,
    };
  });
}

/** Haftalık seçimi `categories.image_url` alanına yazar (cron + önbellek). */
export async function syncHomeCategorySpotlightsToDb(
  supabase: SupabaseClient,
  weekKey = getIsoWeekKey(),
): Promise<{
  weekKey: string;
  updated: Array<{ slug: string; productId: string | null; image: string }>;
}> {
  const cards = await resolveHomeCategorySpotlights(supabase, weekKey);
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id,slug")
    .in("slug", [...HOME_SPOTLIGHT_CATEGORY_SLUGS]);
  if (catError) throw catError;

  const idBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const updated: Array<{ slug: string; productId: string | null; image: string }> = [];

  for (const card of cards) {
    if (!card.image) continue;
    const categoryId = idBySlug.get(card.categorySlug);
    if (!categoryId) continue;

    const { error } = await supabase.from("categories").update({ image_url: card.image }).eq("id", categoryId);
    if (error) throw error;

    updated.push({ slug: card.categorySlug, productId: card.productId, image: card.image });
  }

  return { weekKey, updated };
}
