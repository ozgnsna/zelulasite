/**
 * Merkezi kategori ağacı — URL slug’ları, navigasyon ve /kategori/[slug] sayfaları buradan beslenir.
 * Yeni kategori: bu listeye + (gerekirse) Supabase `categories` tablosuna eklemen yeterli.
 */

export type CategoryTaxon = {
  /** URL ve tree anahtarı (stabil) */
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /**
   * Supabase `categories.slug` ile eşleşme; null = özel liste (ör. setler → öne çıkanlar).
   */
  dbCategorySlug: string | null;
  /** `takilar` / `aksesuar` gibi üst düğümler */
  kind: "parent" | "leaf";
};

export const CATEGORY_TAXONOMY: CategoryTaxon[] = [
  { id: "takilar", name: "Takılar", slug: "takilar", parentId: null, dbCategorySlug: null, kind: "parent" },
  { id: "aksesuar", name: "Aksesuar", slug: "aksesuar", parentId: null, dbCategorySlug: null, kind: "parent" },

  { id: "kolye", name: "Kolye", slug: "kolye", parentId: "takilar", dbCategorySlug: "kolye", kind: "leaf" },
  { id: "kupe", name: "Küpe", slug: "kupe", parentId: "takilar", dbCategorySlug: "kupe", kind: "leaf" },
  { id: "bileklik", name: "Bileklik", slug: "bileklik", parentId: "takilar", dbCategorySlug: "bileklik", kind: "leaf" },
  { id: "bilezik", name: "Bilezik", slug: "bilezik", parentId: "takilar", dbCategorySlug: "bilezik", kind: "leaf" },
  { id: "halhal", name: "Halhal", slug: "halhal", parentId: "takilar", dbCategorySlug: "halhal", kind: "leaf" },
  { id: "yuzuk", name: "Yüzük", slug: "yuzuk", parentId: "takilar", dbCategorySlug: "yuzuk", kind: "leaf" },
  { id: "setler", name: "Setler", slug: "setler", parentId: "takilar", dbCategorySlug: null, kind: "leaf" },

  { id: "bros", name: "Broş", slug: "bros", parentId: "aksesuar", dbCategorySlug: "bros", kind: "leaf" },
  { id: "sapka", name: "Şapka", slug: "sapka", parentId: "aksesuar", dbCategorySlug: "sapka", kind: "leaf" },
  {
    id: "anahtarlik",
    name: "Anahtarlık",
    slug: "anahtarlik",
    parentId: "aksesuar",
    dbCategorySlug: "anahtarlik",
    kind: "leaf",
  },

  {
    id: "hediye-karti",
    name: "Hediye Kartı",
    slug: "hediye-karti",
    parentId: null,
    dbCategorySlug: "hediye-karti",
    kind: "leaf",
  },
];

const bySlug = new Map(CATEGORY_TAXONOMY.map((t) => [t.slug, t]));

export function getTaxonBySlug(slug: string): CategoryTaxon | undefined {
  return bySlug.get(slug);
}

export function isKnownCategorySlug(slug: string): boolean {
  return bySlug.has(slug);
}

export function childrenOf(parentId: string): CategoryTaxon[] {
  return CATEGORY_TAXONOMY.filter((t) => t.parentId === parentId);
}

/** Desktop üst şerit: yaprak takılar + setler (sıra sabit) */
export const HEADER_PRIMARY_LEAF_SLUGS = [
  "kolye",
  "kupe",
  "bileklik",
  "bilezik",
  "yuzuk",
  "setler",
  "hediye-karti",
] as const;

/** Mega menü grupları (üst başlık + çocuk slug’lar) */
export const MEGA_MENU_GROUPS: { title: string; slugs: readonly string[] }[] = [
  {
    title: "Takılar",
    slugs: ["kolye", "kupe", "bileklik", "bilezik", "halhal", "yuzuk", "setler", "hediye-karti"],
  },
  { title: "Aksesuar", slugs: ["bros", "sapka", "anahtarlik"] },
];

export function categoryHref(slug: string): string {
  return `/kategori/${slug}`;
}

/** Takılar hub’ında listelenecek ürünler: çekirdek takı DB slug’ları */
export const TAKILAR_PRODUCT_DB_SLUGS = ["kolye", "kupe", "bileklik", "bilezik", "halhal", "yuzuk"] as const;
