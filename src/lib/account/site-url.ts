/** Canlı site kökü — auth redirect ve e-posta bağlantıları için. */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const base = getPublicSiteUrl();
  if (!base) return "";
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
