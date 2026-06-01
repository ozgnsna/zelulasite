import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/storefront";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { products } = await getProducts({});
  const staticRoutes: MetadataRoute.Sitemap = ["", "/urunler"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/urunler/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...productRoutes];
}
