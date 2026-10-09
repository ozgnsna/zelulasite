import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/** Storefront liste sayfası başına ürün */
export const LISTING_PAGE_SIZE = 24;

export const FILTERED_LISTING_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

export type ListingSearchParams = {
  sayfa?: string;
  q?: string;
  kategori?: string;
  koleksiyon?: string;
  sirala?: string;
  min?: string;
  max?: string;
};

export type ParsedSayfa =
  | { kind: "ok"; page: number }
  | { kind: "redirect_page1" }
  | { kind: "invalid" };

/** `?sayfa=` parse: 1 veya yok → ok(1); 0/negatif → redirect; NaN → invalid */
export function parseSayfaParam(raw: string | undefined): ParsedSayfa {
  if (raw == null || String(raw).trim() === "") return { kind: "ok", page: 1 };
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { kind: "invalid" };
  if (n <= 0) return { kind: "redirect_page1" };
  return { kind: "ok", page: n };
}

/**
 * Filtre / arama varken noindex,follow.
 * Yalnızca `?sayfa=N` noindex YAPMAZ.
 */
export function listingHasNoindexFilters(sp: ListingSearchParams): boolean {
  if (String(sp.q ?? "").trim()) return true;
  if (String(sp.kategori ?? "").trim()) return true;
  if (String(sp.koleksiyon ?? "").trim()) return true;
  if (String(sp.sirala ?? "").trim()) return true;
  if (String(sp.min ?? "").trim()) return true;
  if (String(sp.max ?? "").trim()) return true;
  return false;
}

/** Canonical B: path + yalnızca sayfa≥2 için ?sayfa=N (filtre yok). */
export function listingCanonicalUrl(path: string, page: number): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  if (page <= 1) return absoluteUrl(base);
  return absoluteUrl(`${base}?sayfa=${page}`);
}

export function buildSliceListingMetadata(input: {
  titleSegment: string;
  description: string;
  path: string;
  page: number;
  noindex: boolean;
}): Metadata {
  const title = listingTitleWithPage(input.titleSegment, input.page);
  const description = listingDescriptionWithPage(input.description, input.page);
  const canonical = listingCanonicalUrl(input.path, input.page);
  return {
    title,
    description,
    alternates: { canonical },
    ...(input.noindex ? { robots: FILTERED_LISTING_ROBOTS } : {}),
    openGraph: {
      title: `${title} | Zelula Design`,
      description,
      url: canonical,
      type: "website",
      locale: "tr_TR",
      siteName: "Zelula Design",
    },
  };
}

export function listingTitleWithPage(baseTitle: string, page: number): string {
  if (page <= 1) return baseTitle;
  return `${baseTitle} - Sayfa ${page}`;
}

export function listingDescriptionWithPage(baseDescription: string, page: number): string {
  if (page <= 1) return baseDescription;
  const flat = baseDescription.replace(/\s+/g, " ").trim();
  const suffix = ` Sayfa ${page}.`;
  if (flat.length + suffix.length <= 160) return `${flat}${suffix}`;
  return `${flat.slice(0, Math.max(0, 160 - suffix.length - 1)).trim()}…${suffix}`;
}

export function buildListingPageHref(
  path: string,
  current: ListingSearchParams,
  targetPage: number,
): string {
  const qs = new URLSearchParams();
  const q = String(current.q ?? "").trim();
  const kategori = String(current.kategori ?? "").trim();
  const koleksiyon = String(current.koleksiyon ?? "").trim();
  const sirala = String(current.sirala ?? "").trim();
  const min = String(current.min ?? "").trim();
  const max = String(current.max ?? "").trim();
  if (q) qs.set("q", q);
  if (kategori) qs.set("kategori", kategori);
  if (koleksiyon) qs.set("koleksiyon", koleksiyon);
  if (sirala) qs.set("sirala", sirala);
  if (min) qs.set("min", min);
  if (max) qs.set("max", max);
  if (targetPage > 1) qs.set("sayfa", String(targetPage));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export function totalPagesFor(totalCount: number, pageSize: number = LISTING_PAGE_SIZE): number {
  if (totalCount <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}
