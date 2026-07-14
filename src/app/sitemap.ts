import type { MetadataRoute } from "next";
import { CATEGORY_TAXONOMY } from "@/lib/categories/taxonomy";
import { ERKEK_CATEGORY_SLUGS, ERKEK_HUB_HREF, erkekCategoryHref } from "@/lib/products/audience";
import { getSiteOrigin } from "@/lib/seo/site";
import { getProducts } from "@/lib/storefront";

const STATIC_PATHS = [
  "",
  "/urunler",
  "/cok-satanlar",
  "/kargo-iade",
  "/bakim-rehberi",
  "/hediye-karti",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteOrigin();
  const { products } = await getProducts({});

  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/urunler" ? 0.9 : 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_TAXONOMY.filter(
    (taxon) => taxon.kind === "leaf" || taxon.kind === "parent",
  ).map((taxon) => ({
    url: `${siteUrl}/kategori/${taxon.slug}`,
    changeFrequency: "weekly",
    priority: taxon.kind === "parent" ? 0.75 : 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/urunler/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    lastModified: p.created_at ? new Date(p.created_at) : undefined,
  }));

  const erkekRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}${ERKEK_HUB_HREF}`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ERKEK_CATEGORY_SLUGS.map((slug) => ({
      url: `${siteUrl}${erkekCategoryHref(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];

  return [...staticRoutes, ...categoryRoutes, ...erkekRoutes, ...productRoutes];
}
