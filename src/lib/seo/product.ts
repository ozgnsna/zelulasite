import type { Metadata } from "next";
import { normalizeProductImages, sortProductImages } from "@/lib/products/cover-image";
import { absoluteUrl, getSiteOrigin, truncateMetaDescription } from "@/lib/seo/site";

type ProductSeoInput = {
  name: string;
  slug: string;
  short_description?: string | null;
  full_description?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity?: number | null;
  sku?: string | null;
  material?: string | null;
  product_images?: { image_url?: string | null; is_cover?: boolean | null; sort_order?: number | null }[] | null;
};

const TRENDYOL_CDN_HOST = "cdn.dsmcdn.com";

export function isTrendyolCdnImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname === TRENDYOL_CDN_HOST;
  } catch {
    return url.includes(TRENDYOL_CDN_HOST);
  }
}

/** OG / schema için mümkünse kendi Supabase görsellerini tercih et. */
export function pickSeoProductImageUrl(
  imgs: ProductSeoInput["product_images"],
  fallback = "/zelula-logo.png",
): string {
  const sorted = sortProductImages(normalizeProductImages(imgs));
  const ownHosted = sorted.find((row) => {
    const url = String(row.image_url ?? "").trim();
    return url && !isTrendyolCdnImageUrl(url);
  });
  const picked = ownHosted?.image_url ?? sorted[0]?.image_url ?? fallback;
  if (picked.startsWith("http://") || picked.startsWith("https://")) return picked;
  return absoluteUrl(picked);
}

export function productDescriptionParagraphs(shortRaw: string, fullRaw: string): string[] {
  const short = shortRaw.trim();
  const paragraphs = fullRaw
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (short) {
    if (paragraphs.length === 0) return [short];
    const first = paragraphs[0] ?? "";
    if (short.toLowerCase() !== first.toLowerCase() && !first.toLowerCase().startsWith(short.toLowerCase())) {
      return [short, ...paragraphs];
    }
  }

  return paragraphs.length > 0 ? paragraphs : short ? [short] : [];
}

export function buildProductPageMetadata(product: ProductSeoInput): Metadata {
  const paragraphs = productDescriptionParagraphs(
    product.short_description ?? "",
    product.full_description ?? "",
  );
  const description =
    truncateMetaDescription(paragraphs[0] ?? `${product.name} — Zelula Design takı seçkisi.`) ||
    `${product.name} — Zelula Design.`;
  const pageUrl = absoluteUrl(`/urunler/${product.slug}`);
  const imageUrl = pickSeoProductImageUrl(product.product_images);

  return {
    title: product.name,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: product.name,
      description,
      url: pageUrl,
      type: "website",
      locale: "tr_TR",
      siteName: "Zelula Design",
      images: [{ url: imageUrl, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [imageUrl],
    },
  };
}

export function buildProductJsonLd(
  product: ProductSeoInput & {
    id: string;
    categoryName?: string | null;
    reviewSummary?: { count: number; average: number } | null;
  },
) {
  const paragraphs = productDescriptionParagraphs(
    product.short_description ?? "",
    product.full_description ?? "",
  );
  const description =
    truncateMetaDescription(paragraphs[0] ?? `${product.name} — Zelula Design takı seçkisi.`) ||
    `${product.name} — Zelula Design.`;
  const pageUrl = absoluteUrl(`/urunler/${product.slug}`);
  const images = sortProductImages(normalizeProductImages(product.product_images))
    .map((row) => String(row.image_url ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  const image = images.length > 0 ? images : [pickSeoProductImageUrl(product.product_images)];
  const inStock = Number(product.stock_quantity ?? 0) > 0;
  const reviewSummary = product.reviewSummary;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: "Zelula Design" },
    ...(product.material ? { material: product.material } : {}),
    ...(reviewSummary && reviewSummary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average.toFixed(1),
            reviewCount: reviewSummary.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "TRY",
      price: Number(product.price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
        ? { priceValidUntil: undefined }
        : {}),
    },
  };
}

export function buildProductBreadcrumbJsonLd(product: ProductSeoInput & { categorySlug?: string | null; categoryName?: string | null }) {
  const items: { name: string; path: string }[] = [{ name: "Ürünler", path: "/urunler" }];
  if (product.categorySlug && product.categoryName) {
    items.push({ name: product.categoryName, path: `/kategori/${product.categorySlug}` });
  }
  items.push({ name: product.name, path: `/urunler/${product.slug}` });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zelula Design",
    url: getSiteOrigin(),
    logo: absoluteUrl("/zelula-logo.png"),
    sameAs: ["https://www.instagram.com/zelulaofficial"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "destek@zeluladesign.com",
      availableLanguage: ["Turkish"],
    },
  };
}
