/** Canlı site kökü — metadata, sitemap, canonical için tek kaynak. */
export const DEFAULT_SITE_ORIGIN = "https://www.zeluladesign.com";

function normalizeSiteOrigin(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "zeluladesign.com") {
      parsed.hostname = "www.zeluladesign.com";
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return normalizeSiteOrigin(fromEnv);
  return DEFAULT_SITE_ORIGIN;
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function truncateMetaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}
