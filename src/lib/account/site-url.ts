import { getSiteOrigin } from "@/lib/seo/site";

/** Canlı site kökü — auth redirect ve e-posta bağlantıları için. */

export function getPublicSiteUrl(): string {
  return getSiteOrigin();
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const base = getPublicSiteUrl();
  if (!base) return "";
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
