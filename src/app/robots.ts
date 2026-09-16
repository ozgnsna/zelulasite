import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/hesabim/",
        "/odeme/",
        "/sepet",
        "/giris",
        "/kayit",
        "/sifremi-unuttum",
        "/sifre-yenile",
      ],
    },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  };
}
