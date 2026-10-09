import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Category, Collection, Product } from "@/lib/types";
import {
  childrenOf,
  getTaxonBySlug,
  TAKILAR_PRODUCT_DB_SLUGS,
  type CategoryTaxon,
} from "@/lib/categories/taxonomy";
import {
  audienceMatchValues,
  ERKEK_CATEGORY_SLUGS,
  erkekCategoryLabel,
  type ErkekCategorySlug,
  type TargetAudience,
} from "@/lib/products/audience";
import {
  getIsoWeekKey,
  resolveHomeCategorySpotlights,
  type HomeCategoryCard,
} from "@/lib/storefront/home-category-spotlights";
import { LISTING_PAGE_SIZE, totalPagesFor } from "@/lib/storefront/listing-pagination";
import {
  BESTSELLERS_FALLBACK_DESCRIPTION,
  BESTSELLERS_FALLBACK_TITLE,
  categoryFallbackDescription,
  erkekHubFallbackDescription,
  erkekLeafFallbackDescription,
  resolveListingCopy,
  type ResolvedListingCopy,
} from "@/lib/categories/listing-copy";

/** Liste kartı için dar select — sitemap / tam çekim bunu kullanmaz. */
const LISTING_PRODUCT_SELECT =
  "id,slug,name,price,compare_at_price,featured,new_arrival,category_id,collection_id,created_at,category:categories(id,name,slug),collection:collections(id,name,slug),product_images(image_url,is_cover,sort_order)";

/** Sitemap / SEO: yalnızca slug (+ lastmod). Sayfalama uygulanmaz. */
const SITEMAP_PRODUCT_SELECT = "id,slug,created_at";

function createStorefrontReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

/** İstek başına bir kez. generateMetadata ve sayfa aynı listeyi paylaşır. */
const loadListingCategories = cache(async (): Promise<Category[]> => {
  const supabase = createStorefrontReadClient();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data ?? []) as Category[];
});

const loadListingCollections = cache(async (): Promise<Collection[]> => {
  const supabase = createStorefrontReadClient();
  if (!supabase) return [];
  const { data } = await supabase.from("collections").select("*").order("name");
  return (data ?? []) as Collection[];
});

type StorefrontCountFilters = {
  categoryIds: string[];
  audience: TargetAudience | null;
  collectionId: string | null;
  featuredOnly: boolean;
  min: number | null;
  max: number | null;
  q: string | null;
  includeOutOfStock: boolean;
};

export function storefrontCountKey(input: {
  categoryIds?: string[];
  audience?: TargetAudience | null;
  collectionId?: string | null;
  featuredOnly?: boolean;
  min?: number | null;
  max?: number | null;
  q?: string | null;
  includeOutOfStock?: boolean;
}): string {
  const filters: StorefrontCountFilters = {
    categoryIds: [...(input.categoryIds ?? [])].filter(Boolean).sort(),
    audience: input.audience ?? null,
    collectionId: input.collectionId ?? null,
    featuredOnly: Boolean(input.featuredOnly),
    min: input.min ?? null,
    max: input.max ?? null,
    q: sanitizeListingQuery(input.q ?? "") || null,
    includeOutOfStock: Boolean(input.includeOutOfStock),
  };
  return JSON.stringify(filters);
}

function sanitizeListingQuery(raw: string): string {
  return raw.replace(/[,()*%]/g, " ").trim().slice(0, 80);
}

/** Aktif stok sayımı. Aynı anahtar, metadata ve sayfa gövdesinde bir kez çalışır. */
const countStorefrontProducts = cache(async (key: string): Promise<number> => {
  const supabase = createStorefrontReadClient();
  if (!supabase) return 0;
  const filters = JSON.parse(key) as StorefrontCountFilters;
  let query = supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
  if (!filters.includeOutOfStock) query = query.gt("stock_quantity", 0);
  if (filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
  if (filters.audience) query = query.in("target_audience", audienceMatchValues(filters.audience));
  if (filters.collectionId) query = query.eq("collection_id", filters.collectionId);
  if (filters.featuredOnly) query = query.eq("featured", true);
  if (filters.min) query = query.gte("price", filters.min);
  if (filters.max) query = query.lte("price", filters.max);
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `short_description.ilike.${pattern}`,
        `full_description.ilike.${pattern}`,
        `material.ilike.${pattern}`,
        `color.ilike.${pattern}`,
      ].join(","),
    );
  }
  const { count } = await query;
  return typeof count === "number" ? count : 0;
});

async function fetchHomeDataFromDb() {
  const supabase = createStorefrontReadClient();
  if (!supabase) {
    return {
      categories: [],
      collections: [],
      bestSellers: [],
      bestSellersTitle: "Çok satanlar" as const,
      newArrivals: [] as Product[],
    };
  }
  const HOME_RAIL_TARGET = 8;
  const productSelect = "*, category:categories(*), collection:collections(*), product_images(*)";

  // Üst ray: en yeni stoklu ürünler. Alt ray: featured (çok satan / öne çıkan), üsttekiler hariç.
  const [categoriesRes, collectionsRes, newestRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("collections").select("*").order("name"),
    supabase
      .from("products")
      .select(productSelect)
      .eq("is_active", true)
      .eq("product_kind", "physical")
      .gte("stock_quantity", 1)
      .order("created_at", { ascending: false })
      .limit(HOME_RAIL_TARGET),
  ]);

  const newArrivals = (newestRes.data ?? []) as Product[];
  const primaryIds = newArrivals.map((p) => p.id);

  let featuredQuery = supabase
    .from("products")
    .select(productSelect)
    .eq("is_active", true)
    .eq("product_kind", "physical")
    .gte("stock_quantity", 1)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(HOME_RAIL_TARGET);
  if (primaryIds.length > 0) {
    featuredQuery = featuredQuery.not("id", "in", `(${primaryIds.join(",")})`);
  }
  const { data: featuredRows } = await featuredQuery;
  let bestSellers = (featuredRows ?? []) as Product[];
  let bestSellersTitle: "Çok satanlar" | "Öne çıkanlar" =
    bestSellers.length >= 4 ? "Çok satanlar" : "Öne çıkanlar";

  const need = HOME_RAIL_TARGET - bestSellers.length;
  if (need > 0) {
    const excludeIds = [...primaryIds, ...bestSellers.map((p) => p.id)];
    let fillQuery = supabase
      .from("products")
      .select(productSelect)
      .eq("is_active", true)
      .eq("product_kind", "physical")
      .gte("stock_quantity", 1)
      .order("created_at", { ascending: false })
      .limit(need);
    if (excludeIds.length > 0) {
      fillQuery = fillQuery.not("id", "in", `(${excludeIds.join(",")})`);
    }
    const { data: fill } = await fillQuery;
    if (fill?.length) {
      bestSellers = [...bestSellers, ...(fill as Product[])];
    }
  }

  return {
    categories: categoriesRes.data ?? [],
    collections: collectionsRes.data ?? [],
    bestSellers: bestSellers.slice(0, HOME_RAIL_TARGET),
    bestSellersTitle,
    newArrivals,
  };
}

const getHomeDataCached = unstable_cache(fetchHomeDataFromDb, ["storefront-home-data"], {
  revalidate: 60,
  tags: ["storefront-home"],
});

/** Ana sayfa vitrin verisi — 60 sn önbellek (kullanıcı oturumundan bağımsız). */
export async function getHomeData() {
  try {
    return await getHomeDataCached();
  } catch {
    return {
      categories: [],
      collections: [],
      bestSellers: [],
      bestSellersTitle: "Çok satanlar" as const,
      newArrivals: [] as Product[],
    };
  }
}

const getProductPageHrefByNameCached = unstable_cache(
  async (nameFragment: string) => {
    const supabase = createStorefrontReadClient();
    if (!supabase || !nameFragment.trim()) return null;
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true)
      .ilike("name", `%${nameFragment.trim()}%`)
      .limit(1)
      .maybeSingle();
    const slug = String(data?.slug ?? "").trim();
    return slug ? `/urunler/${slug}` : null;
  },
  ["storefront-product-href-by-name"],
  { revalidate: 300, tags: ["storefront-home"] },
);

/** Banner vb. için ürün adından PDP linki (ör. "Balığın Işıltısı"). */
export async function getProductPageHrefByName(nameFragment: string): Promise<string | null> {
  try {
    return await getProductPageHrefByNameCached(nameFragment);
  } catch {
    return null;
  }
}

function attachCategorySlug(products: Product[]): Product[] {
  return products.map((p) => ({
    ...p,
    categorySlug: p.category?.slug,
  }));
}

export type GetProductsResult = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  /** Eşleşen toplam ürün (sayfalama öncesi). */
  totalCount: number;
  /** 1-based; sayfalama yoksa 1. */
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getProducts(params: {
  category?: string;
  /** Birden fazla DB kategori slug’ı (ör. takılar hub) */
  categorySlugs?: string[];
  collection?: string;
  /** Kadın / erkek vitrin filtresi; verilmezse tüm hedef kitleler */
  audience?: TargetAudience;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
  min?: number;
  max?: number;
  /** Çok satanlar vb.: yalnızca featured=true */
  featuredOnly?: boolean;
  /** Serbest metin araması (ad, açıklama, materyal, renk) */
  q?: string;
  /**
   * true: stokta olmayan aktif ürünleri de dahil et (sitemap / SEO).
   * Listeleme vitrinlerinde varsayılan false kalır.
   */
  includeOutOfStock?: boolean;
  /**
   * 1-based sayfa. Verilmezse (veya pageSize yoksa) tüm sonuçlar döner — sitemap güvenli.
   * Listing sayfaları `page` + `pageSize: LISTING_PAGE_SIZE` geçmeli.
   */
  page?: number;
  /** Sayfa boyutu. Yoksa limit uygulanmaz (geriye uyumlu / sitemap). */
  pageSize?: number;
}): Promise<GetProductsResult> {
  const empty = (categories: Category[] = [], collections: Collection[] = []): GetProductsResult => ({
    products: [],
    categories,
    collections,
    totalCount: 0,
    page: 1,
    pageSize: params.pageSize ?? 0,
    totalPages: 0,
  });

  try {
    // Public katalog: anon client (cookie yok) — sitemap / listing SSR güvenli.
    const supabase = createStorefrontReadClient();
    if (!supabase) return empty();
    const [categories, collections] = await Promise.all([loadListingCategories(), loadListingCollections()]);
    const categoryId = categories.find((c) => c.slug === params.category)?.id;
    const collectionId = collections.find((c) => c.slug === params.collection)?.id;

    const slugList = (params.categorySlugs ?? []).filter(Boolean);
    const categoryIdsFromSlugs =
      slugList.length > 0
        ? categories.filter((c) => slugList.includes(c.slug)).map((c) => c.id)
        : [];

    if (slugList.length > 0 && categoryIdsFromSlugs.length === 0) {
      return empty(categories, collections);
    }

    const paginate =
      typeof params.pageSize === "number" &&
      Number.isFinite(params.pageSize) &&
      params.pageSize > 0;
    const pageSize = paginate ? Math.trunc(params.pageSize!) : 0;
    const page = paginate
      ? Math.max(1, Math.trunc(params.page && params.page > 0 ? params.page : 1))
      : 1;

    const selectCols = paginate
      ? LISTING_PRODUCT_SELECT
      : params.includeOutOfStock
        ? SITEMAP_PRODUCT_SELECT
        : LISTING_PRODUCT_SELECT;

    // Select string değişkeni Supabase Generated Types parser’ına literal gitmez — runtime OK.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyProductFilters = (q: any) => {
      let query = q.eq("is_active", true);
      if (!params.includeOutOfStock) {
        query = query.gt("stock_quantity", 0);
      }
      if (categoryIdsFromSlugs.length > 0) {
        query = query.in("category_id", categoryIdsFromSlugs);
      } else if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      if (collectionId) query = query.eq("collection_id", collectionId);
      if (params.audience) {
        query = query.in("target_audience", audienceMatchValues(params.audience));
      }
      if (params.featuredOnly) query = query.eq("featured", true);
      if (params.min) query = query.gte("price", params.min);
      if (params.max) query = query.lte("price", params.max);

      const safeQuery = sanitizeListingQuery(params.q ?? "");
      if (safeQuery) {
        const pattern = `%${safeQuery}%`;
        query = query.or(
          [
            `name.ilike.${pattern}`,
            `short_description.ilike.${pattern}`,
            `full_description.ilike.${pattern}`,
            `material.ilike.${pattern}`,
            `color.ilike.${pattern}`,
          ].join(","),
        );
      }
      return query;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applySort = (q: any) => {
      switch (params.sort) {
        case "oldest":
          return q.order("created_at", { ascending: true });
        case "price_asc":
          return q.order("price", { ascending: true });
        case "price_desc":
          return q.order("price", { ascending: false });
        case "featured":
          return q.order("featured", { ascending: false });
        default:
          return q.order("created_at", { ascending: false });
      }
    };

    const listingCategoryIds =
      categoryIdsFromSlugs.length > 0 ? categoryIdsFromSlugs : categoryId ? [categoryId] : [];

    // Sayfalarken önce count — taşan .range() Supabase'de 416 verip sayımı düşürür.
    let totalCount = 0;
    if (paginate) {
      totalCount = await countStorefrontProducts(
        storefrontCountKey({
          categoryIds: listingCategoryIds,
          audience: params.audience ?? null,
          collectionId: collectionId ?? null,
          featuredOnly: Boolean(params.featuredOnly),
          min: params.min ?? null,
          max: params.max ?? null,
          q: params.q ?? null,
          includeOutOfStock: Boolean(params.includeOutOfStock),
        }),
      );
      const totalPages = totalPagesFor(totalCount, pageSize);
      if (totalPages === 0 || page > totalPages) {
        return {
          products: [],
          categories,
          collections,
          totalCount,
          page,
          pageSize,
          totalPages,
        };
      }
    }

    let query = applySort(
      applyProductFilters(supabase.from("products").select(selectCols as "*")),
    );

    if (paginate) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getProducts]", error.message);
      return empty(categories, collections);
    }
    const products = attachCategorySlug((data ?? []) as Product[]);
    if (!paginate) {
      totalCount = products.length;
    }
    const totalPages = paginate ? totalPagesFor(totalCount, pageSize) : totalCount > 0 ? 1 : 0;

    return {
      products,
      categories,
      collections,
      totalCount,
      page: paginate ? page : 1,
      pageSize: paginate ? pageSize : totalCount,
      totalPages,
    };
  } catch (err) {
    console.error("[getProducts] unexpected", err instanceof Error ? err.message : err);
    return empty();
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
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      intro: string | null;
      body: string | null;
    }
  | {
      mode: "list";
      taxon: CategoryTaxon;
      products: Product[];
      categories: Category[];
      collections: Collection[];
      listCaption?: string;
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      intro: string | null;
      body: string | null;
    };

export type CategoryListingOptions = {
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
  collection?: string;
  min?: number;
  max?: number;
  page?: number;
  pageSize?: number;
};

export type ListingIndexMeta = ResolvedListingCopy & {
  /** Filtresiz aktif stok. 0 ise sayfa noindex. */
  inStockCount: number;
  /** Koleksiyon / fiyat filtresi uygulanmış sayım. Sayfalama bunu kullanır. */
  filteredCount: number;
};

function categoryCopy(taxon: CategoryTaxon, categories: Category[]): ResolvedListingCopy {
  const dbSlug =
    taxon.kind === "parent" && taxon.slug === "aksesuar" ? "aksesuar" : taxon.dbCategorySlug;
  const db = dbSlug ? categories.find((c) => c.slug === dbSlug) : undefined;
  return resolveListingCopy({
    db,
    codeKey: taxon.slug,
    fallbackTitle: taxon.name,
    fallbackDescription: categoryFallbackDescription(taxon.name),
  });
}

async function indexMetaForSlugs(input: {
  categorySlugs: string[];
  audience: TargetAudience;
  copy: ResolvedListingCopy;
  options: CategoryListingOptions;
}): Promise<ListingIndexMeta> {
  const categories = await loadListingCategories();
  const categoryIds = input.categorySlugs
    .map((slug) => categories.find((c) => c.slug === slug)?.id)
    .filter((id): id is string => Boolean(id));
  if (input.categorySlugs.length > 0 && categoryIds.length === 0) {
    return { ...input.copy, inStockCount: 0, filteredCount: 0 };
  }
  const collections = input.options.collection ? await loadListingCollections() : [];
  const collectionId = input.options.collection
    ? (collections.find((c) => c.slug === input.options.collection)?.id ?? null)
    : null;
  const base = {
    categoryIds,
    audience: input.audience,
    featuredOnly: false as const,
    includeOutOfStock: false as const,
  };
  const unfilteredKey = storefrontCountKey(base);
  const filteredKey = storefrontCountKey({
    ...base,
    collectionId,
    min: input.options.min ?? null,
    max: input.options.max ?? null,
  });
  const inStockCount = await countStorefrontProducts(unfilteredKey);
  const filteredCount =
    filteredKey === unfilteredKey ? inStockCount : await countStorefrontProducts(filteredKey);
  return { ...input.copy, inStockCount, filteredCount };
}

/** Metadata için: ürün satırı yok. Kategori listesi ve sayım sayfa gövdesiyle paylaşılır. */
export async function getCategoryListingMeta(
  slug: string,
  options: CategoryListingOptions = {},
): Promise<ListingIndexMeta | null> {
  const taxon = getTaxonBySlug(slug);
  if (!taxon) return null;
  const categories = await loadListingCategories();
  const copy = categoryCopy(taxon, categories);
  if (taxon.kind === "parent" && taxon.slug === "takilar") {
    return indexMetaForSlugs({
      categorySlugs: [...TAKILAR_PRODUCT_DB_SLUGS],
      audience: "kadin",
      copy,
      options,
    });
  }
  if (taxon.kind === "parent" && taxon.slug === "aksesuar") {
    return indexMetaForSlugs({
      categorySlugs: ["bros", "sapka", "anahtarlik", "aksesuar"],
      audience: "kadin",
      copy,
      options,
    });
  }
  if (taxon.dbCategorySlug) {
    return indexMetaForSlugs({
      categorySlugs: [taxon.dbCategorySlug],
      audience: "kadin",
      copy,
      options,
    });
  }
  return null;
}

export async function getErkekListingMeta(
  slug?: string,
  options: CategoryListingOptions = {},
): Promise<ListingIndexMeta | null> {
  if (slug && !ERKEK_CATEGORY_SLUGS.includes(slug as ErkekCategorySlug)) return null;
  const name = slug ? erkekCategoryLabel(slug as ErkekCategorySlug) : "Erkek Takı";
  const copy = resolveListingCopy({
    codeKey: slug ? `erkek-${slug}` : "erkek",
    fallbackTitle: name,
    fallbackDescription: slug ? erkekLeafFallbackDescription(name) : erkekHubFallbackDescription(),
  });
  return indexMetaForSlugs({
    categorySlugs: slug ? [slug] : [...ERKEK_CATEGORY_SLUGS],
    audience: "erkek",
    copy,
    options,
  });
}

export async function getBestsellersListingMeta(): Promise<ListingIndexMeta> {
  const copy = resolveListingCopy({
    codeKey: "cok-satanlar",
    fallbackTitle: BESTSELLERS_FALLBACK_TITLE,
    fallbackDescription: BESTSELLERS_FALLBACK_DESCRIPTION,
  });
  const inStockCount = await countStorefrontProducts(storefrontCountKey({ featuredOnly: true }));
  return { ...copy, inStockCount, filteredCount: inStockCount };
}

/** `/kategori/[slug]` için ürün listesi veya hub verisi */
export async function getCategoryPageData(
  slug: string,
  options: CategoryListingOptions = {},
): Promise<CategoryPageData | null> {
  const taxon = getTaxonBySlug(slug);
  if (!taxon) return null;

  if (taxon.kind === "parent") {
    const ch = childrenOf(taxon.id);
    const pageOpts = {
      page: options.page,
      pageSize: options.pageSize ?? LISTING_PAGE_SIZE,
    };
    if (taxon.slug === "takilar") {
      const r = await getProducts({
        categorySlugs: [...TAKILAR_PRODUCT_DB_SLUGS],
        audience: "kadin",
        sort: options.sort ?? "newest",
        collection: options.collection,
        min: options.min,
        max: options.max,
        ...pageOpts,
      });
      const copy = categoryCopy(taxon, r.categories);
      return {
        mode: "hub",
        taxon,
        children: ch,
        products: r.products,
        categories: r.categories,
        collections: r.collections,
        totalCount: r.totalCount,
        page: r.page,
        pageSize: r.pageSize,
        totalPages: r.totalPages,
        intro: copy.intro,
        body: copy.body,
      };
    }
    if (taxon.slug === "aksesuar") {
      const r = await getProducts({
        categorySlugs: ["bros", "sapka", "anahtarlik", "aksesuar"],
        audience: "kadin",
        sort: options.sort ?? "newest",
        collection: options.collection,
        min: options.min,
        max: options.max,
        ...pageOpts,
      });
      const copy = categoryCopy(taxon, r.categories);
      return {
        mode: "hub",
        taxon,
        children: ch,
        products: r.products,
        categories: r.categories,
        collections: r.collections,
        totalCount: r.totalCount,
        page: r.page,
        pageSize: r.pageSize,
        totalPages: r.totalPages,
        intro: copy.intro,
        body: copy.body,
      };
    }
    return null;
  }

  if (taxon.dbCategorySlug) {
    const r = await getProducts({
      category: taxon.dbCategorySlug,
      audience: "kadin",
      sort: options.sort ?? "newest",
      collection: options.collection,
      min: options.min,
      max: options.max,
      page: options.page,
      pageSize: options.pageSize ?? LISTING_PAGE_SIZE,
    });
    const copy = categoryCopy(taxon, r.categories);
    const listCaption =
      taxon.slug === "setler" ? "Kolye, küpe, bileklik ve kombin takı setleri." : undefined;
    return {
      mode: "list",
      taxon,
      products: r.products,
      categories: r.categories,
      collections: r.collections,
      listCaption,
      totalCount: r.totalCount,
      page: r.page,
      pageSize: r.pageSize,
      totalPages: r.totalPages,
      intro: copy.intro,
      body: copy.body,
    };
  }

  return null;
}

export type ErkekPageData =
  | {
      mode: "hub";
      products: Product[];
      categories: Category[];
      collections: Collection[];
      children: Array<{ slug: ErkekCategorySlug; name: string }>;
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      intro: string | null;
      body: string | null;
    }
  | {
      mode: "list";
      slug: ErkekCategorySlug;
      name: string;
      products: Product[];
      categories: Category[];
      collections: Collection[];
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      intro: string | null;
      body: string | null;
    };

export async function getErkekPageData(
  slug?: string,
  options: CategoryListingOptions = {},
): Promise<ErkekPageData | null> {
  if (slug && !ERKEK_CATEGORY_SLUGS.includes(slug as ErkekCategorySlug)) return null;

  const pageOpts = {
    page: options.page,
    pageSize: options.pageSize ?? LISTING_PAGE_SIZE,
  };

  if (!slug) {
    const r = await getProducts({
      audience: "erkek",
      categorySlugs: [...ERKEK_CATEGORY_SLUGS],
      sort: options.sort ?? "newest",
      collection: options.collection,
      min: options.min,
      max: options.max,
      ...pageOpts,
    });
    const copy = resolveListingCopy({
      codeKey: "erkek",
      fallbackTitle: "Erkek Takı",
      fallbackDescription: erkekHubFallbackDescription(),
    });
    return {
      mode: "hub",
      products: r.products,
      categories: r.categories,
      collections: r.collections,
      children: ERKEK_CATEGORY_SLUGS.map((s) => ({ slug: s, name: erkekCategoryLabel(s) })),
      totalCount: r.totalCount,
      page: r.page,
      pageSize: r.pageSize,
      totalPages: r.totalPages,
      intro: copy.intro,
      body: copy.body,
    };
  }

  const erkekSlug = slug as ErkekCategorySlug;
  const leafName = erkekCategoryLabel(erkekSlug);
  const r = await getProducts({
    audience: "erkek",
    category: erkekSlug,
    sort: options.sort ?? "newest",
    collection: options.collection,
    min: options.min,
    max: options.max,
    ...pageOpts,
  });
  const leafCopy = resolveListingCopy({
    codeKey: `erkek-${erkekSlug}`,
    fallbackTitle: `Erkek ${leafName}`,
    fallbackDescription: erkekLeafFallbackDescription(leafName),
  });
  return {
    mode: "list",
    slug: erkekSlug,
    name: leafName,
    products: r.products,
    categories: r.categories,
    collections: r.collections,
    totalCount: r.totalCount,
    page: r.page,
    pageSize: r.pageSize,
    totalPages: r.totalPages,
    intro: leafCopy.intro,
    body: leafCopy.body,
  };
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
  bileklik: ["kolye", "kupe", "bilezik"],
  bilezik: ["kolye", "kupe", "bileklik"],
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
    const supabase = await createServerClient();
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

/** Genel takı kelimeleri — tek başına yanlış ürüne fuzzy eşleştirmeyi önlemek için skorlamada sayılmaz. */
const SLUG_GENERIC_TOKENS = new Set([
  "kupe",
  "kolye",
  "yuzuk",
  "bileklik",
  "bilezik",
  "set",
  "seti",
  "zirkon",
  "tasli",
  "tas",
  "altin",
  "gumus",
  "gold",
  "silver",
  "celik",
  "renk",
  "vip",
  "parca",
  "kaplama",
  "detayli",
  "detay",
  "sedef",
  "madalyon",
  "acilir",
  "gunes",
]);

/** Renk/varyant token’ı girdide varsa adayda da olmalı — yoksa yanlış varyanta düşer. */
const SLUG_VARIANT_TOKENS = new Set([
  "mavi",
  "pembe",
  "sari",
  "mor",
  "yesil",
  "kirmizi",
  "turkuaz",
  "mint",
  "beyaz",
  "siyah",
  "gumus",
  "gold",
  "silver",
]);

export async function getProductBySlug(
  slug: string,
  opts?: { includeInactive?: boolean },
) {
  const normalizeSlug = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ü", "u")
      .replaceAll("ğ", "g")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ş", "s")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const boundedLevenshtein = (a: string, b: string, max = 2) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const prev = new Array(b.length + 1).fill(0);
    const curr = new Array(b.length + 1).fill(0);
    for (let j = 0; j <= b.length; j += 1) prev[j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      curr[0] = i;
      let minRow = curr[0];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost,
        );
        minRow = Math.min(minRow, curr[j]);
      }
      if (minRow > max) return max + 1;
      for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
    }
    return prev[b.length];
  };

  const tokenizeSlug = (value: string) =>
    normalizeSlug(value)
      .split("-")
      .filter((t) => t.length >= 2);

  const productSelect =
    "*, category:categories(*), collection:collections(*), product_images(id, image_url, is_cover, sort_order)";

  try {
    const supabase = await createServerClient();
    const decodedSlug = (() => {
      try {
        return decodeURIComponent(slug);
      } catch {
        return slug;
      }
    })();

    // Admin önizleme: pasif ürünü de getir (RLS bypass — service role).
    if (opts?.includeInactive) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const { data: anyStatus } = await admin
          .from("products")
          .select(productSelect)
          .eq("slug", decodedSlug)
          .order("sort_order", { foreignTable: "product_images", ascending: true })
          .maybeSingle();
        if (anyStatus) {
          const p = anyStatus as Product;
          return { ...p, categorySlug: p.category?.slug };
        }
      } catch {
        // service role yoksa aşağıda aktif/pasif akışına düş
      }
    }

    const { data } = await supabase
      .from("products")
      .select(productSelect)
      .eq("slug", decodedSlug)
      .eq("is_active", true)
      .order("sort_order", { foreignTable: "product_images", ascending: true })
      .maybeSingle();
    if (data) {
      const p = data as Product;
      return { ...p, categorySlug: p.category?.slug };
    }

    // Exact slug exists but inactive → 404 (do not fuzzy-match a different product).
    // Storefront RLS only exposes is_active=true, so this check needs service role.
    // Admin kontrolü başarısızsa fuzzy'ye düşme — pasif URL yanlış aktif ürüne gidebilir.
    let inactiveSlugChecked = false;
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: inactiveExact, error: inactiveErr } = await admin
        .from("products")
        .select("id")
        .eq("slug", decodedSlug)
        .eq("is_active", false)
        .maybeSingle();
      if (inactiveErr) return null;
      inactiveSlugChecked = true;
      if (inactiveExact) return null;
    } catch {
      return null;
    }
    if (!inactiveSlugChecked) return null;

    // Fallback: slug varyasyonları (Türkçe karakter/encoding/ufak typo) için toleranslı eşleşme.
    const { data: allActive } = await supabase
      .from("products")
      .select(productSelect)
      .eq("is_active", true)
      .order("sort_order", { foreignTable: "product_images", ascending: true })
      .limit(1200);
    const products = (allActive ?? []) as Product[];
    if (products.length === 0) return null;

    const normalizedInput = normalizeSlug(decodedSlug);
    const exactNormalized = products.find((p) => normalizeSlug(String(p.slug ?? "")) === normalizedInput);
    if (exactNormalized) return { ...exactNormalized, categorySlug: exactNormalized.category?.slug };

    const inputTokens = tokenizeSlug(decodedSlug);
    const distinctiveInput = inputTokens.filter((t) => !SLUG_GENERIC_TOKENS.has(t));
    const specialToken = inputTokens.find((t) => /\d/.test(t) && t.length >= 3) ?? null;
    if (distinctiveInput.length > 0) {
      let bestTokenMatch: Product | null = null;
      let bestTokenScore = -1;
      let bestTokenTies = 0;
      const requiredVariants = distinctiveInput.filter((t) => SLUG_VARIANT_TOKENS.has(t));
      for (const product of products) {
        const productTokens = new Set(tokenizeSlug(String(product.slug ?? "")));
        if (specialToken && !productTokens.has(specialToken)) continue;
        if (requiredVariants.some((t) => !productTokens.has(t))) continue;
        let score = 0;
        for (const token of distinctiveInput) {
          if (productTokens.has(token)) score += 1;
        }
        if (score > bestTokenScore) {
          bestTokenScore = score;
          bestTokenMatch = product;
          bestTokenTies = 1;
        } else if (score === bestTokenScore && score > 0) {
          bestTokenTies += 1;
        }
      }
      // En az 2 ayırt edici token veya girdinin %60'ı — "zirkon/gold/kupe" ile yanlış eşleşmeyi keser.
      // Aynı skorda birden fazla aday varsa (renk varyantı vb.) tahmin etme → 404.
      const minScore = Math.max(2, Math.ceil(distinctiveInput.length * 0.6));
      if (bestTokenMatch && bestTokenScore >= minScore && bestTokenTies === 1) {
        return { ...bestTokenMatch, categorySlug: bestTokenMatch.category?.slug };
      }
    }

    // Tek harf farkı bile (gold-a-harf vs gold-y-harf) yanlış ürün olabilir — max 2.
    let best: Product | null = null;
    let bestDistance = 3;
    for (const product of products) {
      const d = boundedLevenshtein(normalizedInput, normalizeSlug(String(product.slug ?? "")), 2);
      if (d < bestDistance) {
        bestDistance = d;
        best = product;
      }
    }
    if (!best || bestDistance > 2) return null;
    return { ...best, categorySlug: best.category?.slug };
  } catch {
    return null;
  }
}

const getHomeCategoryCardsCached = unstable_cache(
  async (weekKey: string) => {
    const supabase = createStorefrontReadClient();
    if (!supabase) return [] as HomeCategoryCard[];
    return resolveHomeCategorySpotlights(supabase, weekKey);
  },
  ["home-category-cards"],
  { revalidate: 3600, tags: ["home-category-spotlights", "storefront-home"] },
);

export async function getHomeCategoryCards(): Promise<HomeCategoryCard[]> {
  try {
    return await getHomeCategoryCardsCached(getIsoWeekKey());
  } catch {
    return [];
  }
}
