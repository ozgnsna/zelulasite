import type { Metadata } from "next";
import { normalizeProductImages, sortProductImages } from "@/lib/products/cover-image";
import {
  ERKEK_HUB_HREF,
  erkekCategoryHref,
  erkekCategoryLabel,
  isErkekCategorySlug,
} from "@/lib/products/audience";
import { isProductVideoUrl } from "@/lib/products/media-url";
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
    return url && !isTrendyolCdnImageUrl(url) && !isProductVideoUrl(url);
  });
  const stillImage = sorted.find((row) => !isProductVideoUrl(String(row.image_url ?? "")));
  const picked = ownHosted?.image_url ?? stillImage?.image_url ?? sorted[0]?.image_url ?? fallback;
  if (picked.startsWith("http://") || picked.startsWith("https://")) return picked;
  return absoluteUrl(picked);
}

/** Meta description: full_description ilk paragrafı. short_description kullanılmaz. */
export function productPageMetaDescription(product: {
  name: string;
  full_description?: string | null;
}): string {
  const first = String(product.full_description ?? "")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .find((paragraph) => paragraph.length > 0);
  const raw = first || `${product.name} — Zelula Design takı seçkisi.`;
  return truncateMetaDescription(raw) || `${product.name} — Zelula Design.`;
}

export function buildProductPageMetadata(product: ProductSeoInput): Metadata {
  const description = productPageMetaDescription(product);
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
  const description = productPageMetaDescription(product);
  const pageUrl = absoluteUrl(`/urunler/${product.slug}`);
  const images = sortProductImages(normalizeProductImages(product.product_images))
    .map((row) => String(row.image_url ?? "").trim())
    .filter((url) => url && !isProductVideoUrl(url))
    .slice(0, 8);
  const image = images.length > 0 ? images : [pickSeoProductImageUrl(product.product_images)];
  const inStock = Number(product.stock_quantity ?? 0) > 0;
  const reviewSummary = product.reviewSummary;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    url: pageUrl,
    image,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: "Zelula Design" },
    ...(product.categoryName ? { category: product.categoryName } : {}),
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
      seller: { "@type": "Organization", name: "Zelula Design" },
    },
  };
}

export function buildProductBreadcrumbJsonLd(
  product: ProductSeoInput & {
    categorySlug?: string | null;
    categoryName?: string | null;
    targetAudience?: string | null;
  },
) {
  const categorySlug = product.categorySlug ?? null;
  const erkekLeaf =
    product.targetAudience === "erkek" && categorySlug && isErkekCategorySlug(categorySlug)
      ? categorySlug
      : null;
  const items: { name: string; path: string }[] = erkekLeaf
    ? [
        { name: "Erkek", path: ERKEK_HUB_HREF },
        {
          name: `Erkek ${erkekCategoryLabel(erkekLeaf)}`,
          path: erkekCategoryHref(erkekLeaf),
        },
      ]
    : [{ name: "Ürünler", path: "/urunler" }];
  if (!erkekLeaf && categorySlug && product.categoryName) {
    items.push({ name: product.categoryName, path: `/kategori/${categorySlug}` });
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
