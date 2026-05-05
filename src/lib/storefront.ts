import { createClient } from "@/lib/supabase/server";
import type { Category, Collection, Product } from "@/lib/types";
import {
  childrenOf,
  getTaxonBySlug,
  TAKILAR_PRODUCT_DB_SLUGS,
  type CategoryTaxon,
} from "@/lib/categories/taxonomy";

export async function getHomeData() {
  try {
    const supabase = await createClient();
    const [categoriesRes, collectionsRes, bestRes, newRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("collections").select("*").order("name"),
      supabase
        .from("products")
        .select("*, category:categories(*), collection:collections(*), product_images(*)")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(8),
      supabase
        .from("products")
        .select("*, category:categories(*), collection:collections(*), product_images(*)")
        .eq("is_active", true)
        .eq("new_arrival", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      categories: categoriesRes.data ?? [],
      collections: collectionsRes.data ?? [],
      bestSellers: (bestRes.data ?? []) as Product[],
      newArrivals: (newRes.data ?? []) as Product[],
    };
  } catch {
    return { categories: [], collections: [], bestSellers: [], newArrivals: [] as Product[] };
  }
}

function attachCategorySlug(products: Product[]): Product[] {
  return products.map((p) => ({
    ...p,
    categorySlug: p.category?.slug,
  }));
}

export async function getProducts(params: {
  category?: string;
  /** Birden fazla DB kategori slug’ı (ör. takılar hub) */
  categorySlugs?: string[];
  collection?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "featured";
  min?: number;
  max?: number;
  /** Çok satanlar vb.: yalnızca featured=true */
  featuredOnly?: boolean;
}) {
  try {
    const supabase = await createClient();
    const [categoriesRes, collectionsRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("collections").select("*").order("name"),
    ]);
    const categories = categoriesRes.data ?? [];
    const collections = collectionsRes.data ?? [];
    const categoryId = categories.find((c) => c.slug === params.category)?.id;
    const collectionId = collections.find((c) => c.slug === params.collection)?.id;

    const slugList = (params.categorySlugs ?? []).filter(Boolean);
    const categoryIdsFromSlugs =
      slugList.length > 0
        ? categories.filter((c) => slugList.includes(c.slug)).map((c) => c.id)
        : [];

    if (slugList.length > 0 && categoryIdsFromSlugs.length === 0) {
      return { products: [], categories, collections };
    }

    let query = supabase
      .from("products")
      .select("*, category:categories(*), collection:collections(*), product_images(*)")
      .eq("is_active", true);

    if (categoryIdsFromSlugs.length > 0) {
      query = query.in("category_id", categoryIdsFromSlugs);
    } else if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    if (collectionId) query = query.eq("collection_id", collectionId);
    if (params.featuredOnly) query = query.eq("featured", true);
    if (params.min) query = query.gte("price", params.min);
    if (params.max) query = query.lte("price", params.max);

    switch (params.sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "featured":
        query = query.order("featured", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data } = await query;
    return {
      products: attachCategorySlug((data ?? []) as Product[]),
      categories,
      collections,
    };
  } catch {
    return { products: [] as Product[], categories: [], collections: [] };
  }
}

export type CategoryPageData =
  | {
      mode: "hub";
      taxon: CategoryTaxon;
      children: CategoryTaxon[];
      products: Product[];
      categories: Category[];
      collections: Collection[];
    }
  | {
      mode: "list";
      taxon: CategoryTaxon;
      products: Product[];
      categories: Category[];
      collections: Collection[];
      listCaption?: string;
    };

/** `/kategori/[slug]` için ürün listesi veya hub verisi */
export async function getCategoryPageData(slug: string): Promise<CategoryPageData | null> {
  const taxon = getTaxonBySlug(slug);
  if (!taxon) return null;

  if (taxon.kind === "parent") {
    const ch = childrenOf(taxon.id);
    if (taxon.slug === "takilar") {
      const r = await getProducts({
        categorySlugs: [...TAKILAR_PRODUCT_DB_SLUGS],
        sort: "newest",
      });
      return {
        mode: "hub",
        taxon,
        children: ch,
        products: r.products,
        categories: r.categories,
        collections: r.collections,
      };
    }
    if (taxon.slug === "aksesuar") {
      const r = await getProducts({
        categorySlugs: ["bros", "sapka", "aksesuar"],
        sort: "newest",
      });
      return {
        mode: "hub",
        taxon,
        children: ch,
        products: r.products,
        categories: r.categories,
        collections: r.collections,
      };
    }
    return null;
  }

  if (taxon.slug === "setler") {
    const r = await getProducts({ sort: "featured", featuredOnly: true });
    return {
      mode: "list",
      taxon,
      products: r.products,
      categories: r.categories,
      collections: r.collections,
      listCaption: "Öne çıkan seçkiler — koleksiyonlarını tamamlayan parçalar.",
    };
  }

  if (taxon.dbCategorySlug) {
    const r = await getProducts({ category: taxon.dbCategorySlug, sort: "newest" });
    return {
      mode: "list",
      taxon,
      products: r.products,
      categories: r.categories,
      collections: r.collections,
    };
  }

  return null;
}

type CartUpsellContextItem = {
  id: string;
  name?: string | null;
  categoryName?: string | null;
  collectionId?: string | null;
  material?: string | null;
  color?: string | null;
  price: number;
};

type StyleDna = "minimal" | "statement" | "daily" | "evening" | "romantic" | "modern";

const COMPLEMENTARY_CATEGORY_MAP: Record<string, string[]> = {
  kolye: ["kupe", "bileklik"],
  kupe: ["kolye", "yuzuk"],
  yuzuk: ["kolye", "kupe"],
  bileklik: ["kolye", "kupe"],
};

function normalizeCategoryName(name?: string | null) {
  if (!name) return "";
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ü", "u")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c");
}

function normalizeText(value?: string | null) {
  if (!value) return "";
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ü", "u")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c");
}

function detectTone(value?: string | null): "gold" | "silver" | "rose-gold" | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.includes("rose gold") || text.includes("rosegold") || text.includes("rose")) return "rose-gold";
  if (text.includes("gumus") || text.includes("silver")) return "silver";
  if (text.includes("altin") || text.includes("gold")) return "gold";
  return null;
}

const STYLE_KEYWORDS: Record<StyleDna, string[]> = {
  minimal: ["minimal", "sade", "ince", "zarif", "clean", "basic"],
  statement: ["statement", "iddiali", "bold", "charm", "gosterisli", "buyuk"],
  daily: ["daily", "gunluk", "everyday", "temel", "rahat"],
  evening: ["evening", "gece", "davet", "party", "sik", "parlak"],
  romantic: ["romantic", "romantik", "kalp", "inci", "cicek", "soft"],
  modern: ["modern", "geometrik", "geometric", "contemporary", "trend", "line"],
};

const COMPLEMENTARY_STYLE_MAP: Partial<Record<StyleDna, StyleDna[]>> = {
  minimal: ["modern", "daily"],
  statement: ["evening", "romantic"],
  daily: ["minimal", "modern"],
  evening: ["statement", "romantic"],
  romantic: ["evening", "minimal"],
  modern: ["minimal", "statement"],
};

function inferStyleDna(values: Array<string | null | undefined>): StyleDna | null {
  const text = normalizeText(values.filter(Boolean).join(" "));
  if (!text) return null;
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS) as Array<[StyleDna, string[]]>) {
    if (keywords.some((keyword) => text.includes(keyword))) return style;
  }
  return null;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/** Curated cart upsell picks with harmony scoring + premium fallback. */
export async function getCartUpsellProducts(cartItems: CartUpsellContextItem[], limit = 3): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*), collection:collections(*), product_images(*)")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);

    const excluded = new Set(cartItems.map((item) => item.id));
    const candidates = ((data ?? []) as Product[]).filter((product) => !excluded.has(product.id));
    if (candidates.length === 0) return [];

    const cartCollectionIds = new Set(
      cartItems.map((item) => item.collectionId).filter((id): id is string => Boolean(id)),
    );
    const cartCategories = new Set(
      cartItems
        .map((item) => normalizeCategoryName(item.categoryName))
        .filter((value) => value.length > 0),
    );
    const complementaryTargets = new Set(
      Array.from(cartCategories).flatMap((category) => COMPLEMENTARY_CATEGORY_MAP[category] ?? []),
    );
    const cartTones = new Set(
      cartItems
        .flatMap((item) => [detectTone(item.material), detectTone(item.color)])
        .filter((tone): tone is "gold" | "silver" | "rose-gold" => Boolean(tone)),
    );
    const cartStyles = new Set(
      cartItems
        .map((item) => inferStyleDna([item.name, item.categoryName, item.material, item.color]))
        .filter((style): style is StyleDna => Boolean(style)),
    );
    const averageCartPrice =
      cartItems.length > 0 ? cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0) / cartItems.length : 0;
    const minBand = averageCartPrice * 0.6;
    const maxBand = averageCartPrice * 1.4;

    const isComplementary = (categoryName?: string | null) => complementaryTargets.has(normalizeCategoryName(categoryName));
    const isSameCollection = (product: Product) =>
      Boolean(product.collection_id && cartCollectionIds.size > 0 && cartCollectionIds.has(product.collection_id));
    const cartCategoryList = Array.from(cartCategories);
    const maxCandidateStock = Math.max(...candidates.map((candidate) => Number(candidate.stock_quantity) || 0), 1);
    const scoreByProduct = candidates
      .map((product) => {
        const productCategory = normalizeCategoryName(product.category?.name);
        const productPrice = Number(product.price) || 0;
        const productTone = detectTone(product.material) ?? detectTone(product.color);
        const sameCollection = isSameCollection(product);
        const complementary = isComplementary(product.category?.name);
        const differentFromCartCategories = productCategory.length > 0 && !cartCategories.has(productCategory);
        const sameCollectionDifferentCategory = sameCollection && differentFromCartCategories;
        const sameCollectionComplementaryDifferentCategory = sameCollectionDifferentCategory && complementary;
        const complementaryWithTone = complementary && Boolean(productTone && cartTones.has(productTone));
        const productStyle = inferStyleDna([product.name, product.category?.name, product.material, product.color]);
        const sameStyle = Boolean(productStyle && cartStyles.has(productStyle));
        const complementaryStyle = Boolean(
          productStyle &&
            Array.from(cartStyles).some((cartStyle) => COMPLEMENTARY_STYLE_MAP[cartStyle]?.includes(productStyle)),
        );
        const styleContrastMinimalStatement = Boolean(
          productStyle &&
            ((productStyle === "minimal" && cartStyles.has("statement")) ||
              (productStyle === "statement" && cartStyles.has("minimal"))),
        );
        let score = 0;

        // Priority 1: same collection + complementary different category (set-building core).
        if (sameCollectionComplementaryDifferentCategory) score += 160;
        // Extra bonus: same collection + different category even if not complementary.
        else if (sameCollectionDifferentCategory) score += 115;
        // Priority 2: complementary + same tone/material harmony.
        if (complementaryWithTone) score += 90;
        else if (complementary) score += 55;
        // Priority 3: style DNA harmony or intentional contrast.
        if (sameStyle) score += 55;
        if (complementaryStyle) score += 45;
        if (styleContrastMinimalStatement) score += 50;
        // Priority 3: same collection baseline.
        if (sameCollection) score += 35;
        // Extra aesthetic harmony signal.
        if (productTone && cartTones.has(productTone)) score += 25;
        // Slight preference for category variety if cart holds multiple category types.
        if (cartCategoryList.length > 1 && differentFromCartCategories) score += 10;
        // Priority 4: similar price band.
        if (averageCartPrice > 0 && productPrice >= minBand && productPrice <= maxBand) score += 20;

        // Conversion layer: weight by affordability fit, stock urgency and value-perception.
        const priceDistanceRatio =
          averageCartPrice > 0 ? Math.abs(productPrice - averageCartPrice) / Math.max(averageCartPrice, 1) : 1;
        const priceFitSignal = 1 - clamp(priceDistanceRatio, 0, 1); // closer to cart AOV converts better.
        const stockUrgencySignal = 1 - clamp((Number(product.stock_quantity) || 0) / maxCandidateStock, 0, 1); // lower stock => urgency.
        const compareAtPrice = Number(product.compare_at_price || 0);
        const discountSignal =
          compareAtPrice > productPrice && compareAtPrice > 0 ? clamp((compareAtPrice - productPrice) / compareAtPrice, 0, 1) : 0;
        const conversionBoost = priceFitSignal * 35 + stockUrgencySignal * 20 + discountSignal * 15;
        score += Math.round(conversionBoost);

        return {
          product,
          score,
          conversionBoost,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.conversionBoost - a.conversionBoost ||
          Number(b.product.featured) - Number(a.product.featured),
      );

    const curated = scoreByProduct.filter((entry) => entry.score > 0).map((entry) => entry.product);
    if (curated.length >= limit) return curated.slice(0, limit);

    const curatedIds = new Set(curated.map((item) => item.id));
    const fallbackFeaturedOrNew = candidates.filter(
      (product) => (product.featured || product.new_arrival) && !curatedIds.has(product.id),
    );

    return [...curated, ...fallbackFeaturedOrNew].slice(0, limit);
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*), collection:collections(*), product_images(*)")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    if (!data) return null;
    const p = data as Product;
    return { ...p, categorySlug: p.category?.slug };
  } catch {
    return null;
  }
}
