import { CATEGORY_TAXONOMY, getTaxonBySlug } from "@/lib/categories/taxonomy";
import { STANDARD_SHIPPING_FEE_TRY } from "@/lib/free-shipping";
import { unwrapSupabaseRelation } from "@/lib/gift-cards/unwrap-relation";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";

export const GOOGLE_FEED_BRAND = "Zelula";

/** Google Merchant `id` üst sınırı. */
export const GOOGLE_FEED_ID_MAX_LENGTH = 50;

/** Apparel & Accessories > Jewelry — genel takı (201 saat; kullanılmaz). */
export const GOOGLE_PRODUCT_CATEGORY_JEWELRY = "188";

const MIN_DESCRIPTION_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 5000;
const DESCRIPTION_PAD = "Zelula Design takı koleksiyonundan bir parça.";

/** Site kategorisi → Google ürün taksonomisi ID. */
const GOOGLE_CATEGORY_BY_SLUG: Record<string, string> = {
  kolye: "196",
  kupe: "194",
  bileklik: "191",
  bilezik: "191",
  halhal: "189",
  sahmeran: "190",
  yuzuk: "200",
  setler: "6463",
  bros: "197",
  sapka: "173",
  anahtarlik: "175",
};

export type GoogleFeedProductRow = {
  id?: string | null;
  slug: string | null;
  name: string | null;
  sku?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  price: number | null;
  compare_at_price?: number | null;
  stock_quantity?: number | null;
  material?: string | null;
  product_kind?: string | null;
  category?: { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null;
  product_images?: { image_url?: string | null; is_cover?: boolean | null; sort_order?: number | null }[] | null;
  product_variants?: {
    id?: string | null;
    label?: string | null;
    stock_quantity?: number | null;
    is_active?: boolean | null;
  }[] | null;
};

export type GoogleFeedSkipReason = "gift_card" | "invalid" | "no_image" | "no_sku" | "id_too_long";

export type GoogleFeedOffer = { xml: string; id: string };

export type GoogleFeedItemResult =
  | { ok: true; offers: GoogleFeedOffer[]; slug: string }
  | { ok: false; reason: GoogleFeedSkipReason; slug: string; name: string };

export type GoogleFeedBuildResult = {
  itemsXml: string;
  included: number;
  offerIds: string[];
  skippedGiftCard: number;
  skippedInvalid: number;
  skippedNoImage: number;
  skippedNoSku: number;
  skippedIdTooLong: number;
  skippedNoImageSlugs: string[];
  skippedNoSkuSlugs: string[];
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function flattenFeedText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function googleProductCategoryId(categorySlug: string | null | undefined): string {
  const slug = String(categorySlug ?? "").trim();
  return GOOGLE_CATEGORY_BY_SLUG[slug] ?? GOOGLE_PRODUCT_CATEGORY_JEWELRY;
}

export function googleProductType(
  categorySlug: string | null | undefined,
  categoryName: string | null | undefined,
): string | null {
  const name = String(categoryName ?? "").trim();
  const slug = String(categorySlug ?? "").trim();
  const taxon = slug ? getTaxonBySlug(slug) : undefined;
  const parent = taxon?.parentId
    ? CATEGORY_TAXONOMY.find((t) => t.id === taxon.parentId)
    : undefined;
  const leaf = name || taxon?.name || "";
  if (parent?.name && leaf) return `${parent.name} > ${leaf}`;
  return leaf || null;
}

export function formatFeedMoneyTry(amount: number): string {
  return `${amount.toFixed(2)} TRY`;
}

/**
 * Feed kargosunu sepet eşiğine göre değiştirme.
 * Ücretsiz kargo sepet toplamına bakıyor; tek ürün fiyatı yeterli değil.
 */
export function feedShippingPriceTry(): number {
  return STANDARD_SHIPPING_FEE_TRY;
}

/** Merchant `id`: SKU, varyantta `SKU-ölçü`. Slug kullanılmaz (50 karakter limiti). */
export function buildFeedOfferId(sku: string, variantLabel?: string | null): string {
  const base = String(sku ?? "").trim().replace(/\s+/g, "");
  const variant = String(variantLabel ?? "").trim().replace(/\s+/g, "");
  return variant ? `${base}-${variant}` : base;
}

function activeFeedVariants(p: GoogleFeedProductRow): NonNullable<GoogleFeedProductRow["product_variants"]> {
  return (p.product_variants ?? []).filter(
    (v) => v?.is_active !== false && String(v?.label ?? "").trim().length > 0,
  );
}

export function buildFallbackDescription(
  name: string,
  categoryName: string | null | undefined,
  material: string | null | undefined,
): string {
  const parts = [name.trim()].filter(Boolean);
  const category = String(categoryName ?? "").trim();
  const mat = String(material ?? "").trim();
  if (category) parts.push(`${lowerTr(category)} kategorisinde`);
  if (mat) parts.push(lowerTr(mat));

  let text = parts.join(", ");
  if (text && !/[.!?]$/.test(text)) text += ".";
  if (text.length < MIN_DESCRIPTION_LENGTH) {
    text = text ? `${text.replace(/[.!?]$/, "")}. ${DESCRIPTION_PAD}` : `${name.trim()}. ${DESCRIPTION_PAD}`;
  }
  return flattenFeedText(text);
}

export function resolveFeedDescription(input: {
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  categoryName?: string | null;
  material?: string | null;
}): string {
  const short = flattenFeedText(String(input.shortDescription ?? ""));
  if (short) return clipDescription(ensureMinDescription(short, input.name, input.categoryName, input.material));

  const full = flattenFeedText(String(input.fullDescription ?? ""));
  if (full) return clipDescription(ensureMinDescription(full, input.name, input.categoryName, input.material));

  return clipDescription(buildFallbackDescription(input.name, input.categoryName, input.material));
}

export function toAbsoluteFeedUrl(url: string, siteOrigin: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const origin = siteOrigin.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

function renderFeedItemXml(input: {
  offerId: string;
  name: string;
  description: string;
  link: string;
  imageLink: string;
  price: number;
  inStock: boolean;
  sku: string;
  categorySlug: string | null;
  productType: string | null;
  itemGroupId?: string | null;
  size?: string | null;
}): string {
  const shipping = feedShippingPriceTry();
  const lines = [
    `    <item>`,
    `      <g:id>${escapeXml(input.offerId)}</g:id>`,
    `      <g:title>${escapeXml(input.name)}</g:title>`,
    `      <g:description>${escapeXml(input.description)}</g:description>`,
    `      <g:link>${escapeXml(input.link)}</g:link>`,
    `      <g:image_link>${escapeXml(input.imageLink)}</g:image_link>`,
    `      <g:price>${escapeXml(formatFeedMoneyTry(input.price))}</g:price>`,
    `      <g:availability>${input.inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
    `      <g:condition>new</g:condition>`,
    `      <g:brand>${escapeXml(GOOGLE_FEED_BRAND)}</g:brand>`,
    `      <g:identifier_exists>false</g:identifier_exists>`,
    `      <g:mpn>${escapeXml(input.sku)}</g:mpn>`,
    `      <g:google_product_category>${escapeXml(googleProductCategoryId(input.categorySlug))}</g:google_product_category>`,
  ];

  if (input.productType) {
    lines.push(`      <g:product_type>${escapeXml(input.productType)}</g:product_type>`);
  }
  if (input.itemGroupId) {
    lines.push(`      <g:item_group_id>${escapeXml(input.itemGroupId)}</g:item_group_id>`);
  }
  if (input.size) {
    lines.push(`      <g:size>${escapeXml(input.size)}</g:size>`);
  }

  lines.push(
    `      <g:shipping>`,
    `        <g:country>TR</g:country>`,
    `        <g:service>Standart</g:service>`,
    `        <g:price>${escapeXml(formatFeedMoneyTry(shipping))}</g:price>`,
    `      </g:shipping>`,
    `    </item>`,
  );

  return lines.join("\n");
}

export function buildGoogleFeedItem(p: GoogleFeedProductRow, siteOrigin: string): GoogleFeedItemResult {
  const slug = String(p.slug ?? "").trim();
  const name = String(p.name ?? "").trim();

  if (p.product_kind === "gift_card") {
    return { ok: false, reason: "gift_card", slug, name };
  }
  if (!slug || !name) {
    return { ok: false, reason: "invalid", slug, name };
  }

  const sku = String(p.sku ?? "").trim().replace(/\s+/g, "");
  if (!sku) {
    return { ok: false, reason: "no_sku", slug, name };
  }

  const rawImage = pickProductCoverImageUrl(p.product_images, "");
  const imageLink = toAbsoluteFeedUrl(rawImage, siteOrigin);
  if (!imageLink) {
    return { ok: false, reason: "no_image", slug, name };
  }

  const category = unwrapSupabaseRelation(p.category);
  const categoryName = String(category?.name ?? "").trim() || null;
  const categorySlug = String(category?.slug ?? "").trim() || null;
  const material = String(p.material ?? "").trim() || null;

  // sale_price kapalı: Google 10 günlük fiyat geçmişi ister.
  // product_price_history en az 10 gün birikince compare_at / geçmiş
  // fiyattan sale_price tekrar açılacak (price = eski, sale_price = güncel).
  const currentPrice = Number(p.price ?? 0);
  const description = resolveFeedDescription({
    name,
    shortDescription: p.short_description,
    fullDescription: p.full_description,
    categoryName,
    material,
  });
  const productType = googleProductType(categorySlug, categoryName);
  const link = `${siteOrigin.replace(/\/+$/, "")}/urunler/${slug}`;
  const variants = activeFeedVariants(p);

  const offerInputs =
    variants.length > 0
      ? variants.map((v) => {
          const label = String(v.label ?? "").trim();
          return {
            offerId: buildFeedOfferId(sku, label),
            inStock: Number(v.stock_quantity ?? 0) > 0,
            itemGroupId: sku,
            size: label,
          };
        })
      : [
          {
            offerId: buildFeedOfferId(sku),
            inStock: Number(p.stock_quantity ?? 0) > 0,
            itemGroupId: null as string | null,
            size: null as string | null,
          },
        ];

  const tooLong = offerInputs.find((o) => o.offerId.length > GOOGLE_FEED_ID_MAX_LENGTH);
  if (tooLong) {
    return { ok: false, reason: "id_too_long", slug, name };
  }

  const offers = offerInputs.map((o) => ({
    id: o.offerId,
    xml: renderFeedItemXml({
      offerId: o.offerId,
      name,
      description,
      link,
      imageLink,
      price: currentPrice,
      inStock: o.inStock,
      sku,
      categorySlug,
      productType,
      itemGroupId: o.itemGroupId,
      size: o.size,
    }),
  }));

  return { ok: true, offers, slug };
}

export function buildGoogleMerchantFeed(
  products: GoogleFeedProductRow[],
  siteOrigin: string,
): GoogleFeedBuildResult {
  const skippedNoImageSlugs: string[] = [];
  const skippedNoSkuSlugs: string[] = [];
  const offerIds: string[] = [];
  let included = 0;
  let skippedGiftCard = 0;
  let skippedInvalid = 0;
  let skippedNoImage = 0;
  let skippedNoSku = 0;
  let skippedIdTooLong = 0;
  const items: string[] = [];

  for (const product of products) {
    const result = buildGoogleFeedItem(product, siteOrigin);
    if (result.ok) {
      included += result.offers.length;
      for (const offer of result.offers) {
        items.push(offer.xml);
        offerIds.push(offer.id);
      }
      continue;
    }
    if (result.reason === "gift_card") skippedGiftCard += 1;
    else if (result.reason === "invalid") skippedInvalid += 1;
    else if (result.reason === "no_sku") {
      skippedNoSku += 1;
      skippedNoSkuSlugs.push(result.slug || result.name || "(adsız)");
    } else if (result.reason === "id_too_long") skippedIdTooLong += 1;
    else {
      skippedNoImage += 1;
      skippedNoImageSlugs.push(result.slug || result.name || "(adsız)");
    }
  }

  return {
    itemsXml: items.join("\n"),
    included,
    offerIds,
    skippedGiftCard,
    skippedInvalid,
    skippedNoImage,
    skippedNoSku,
    skippedIdTooLong,
    skippedNoImageSlugs,
    skippedNoSkuSlugs,
  };
}

export function renderGoogleMerchantRss(itemsXml: string, siteOrigin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(GOOGLE_FEED_BRAND)}</title>
    <link>${escapeXml(siteOrigin)}</link>
    <description>${escapeXml(`${GOOGLE_FEED_BRAND} ürün feed'i (Google Merchant Center)`)}</description>
${itemsXml}
  </channel>
</rss>`;
}

function lowerTr(value: string): string {
  return value.toLocaleLowerCase("tr-TR");
}

function ensureMinDescription(
  text: string,
  name: string,
  categoryName?: string | null,
  material?: string | null,
): string {
  let next = flattenFeedText(text);
  if (next.length >= MIN_DESCRIPTION_LENGTH) return next;

  if (!next) return buildFallbackDescription(name, categoryName, material);

  const extra = [categoryName, material].map((x) => String(x ?? "").trim()).filter(Boolean);
  if (extra.length > 0) {
    const suffix = extra.map((x) => lowerTr(x)).join(", ");
    next = next.endsWith(".") ? `${next} ${suffix}.` : `${next}, ${suffix}.`;
  }
  if (next.length < MIN_DESCRIPTION_LENGTH) {
    next = `${next.replace(/[.!?]$/, "")}. ${DESCRIPTION_PAD}`;
  }
  return flattenFeedText(next);
}

function clipDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}
