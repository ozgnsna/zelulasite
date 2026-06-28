/**
 * Eski kök düzey ürün URL'leri (/{slug}) → /urunler/{slug} yönlendirmesi.
 * Yalnızca tek segmentli, bilinen statik rota olmayan isteklerde devreye girer.
 */

/** `src/app` altındaki üst düzey sayfa segmentleri — ürün slug'ı değildir. */
export const RESERVED_ROOT_SEGMENTS = new Set([
  "_next",
  "_vercel",
  "admin",
  "api",
  "apple-icon",
  "auth",
  "bakim-rehberi",
  "cok-satanlar",
  "giris",
  "gizlilik-politikasi",
  "hediye-karti",
  "hesabim",
  "iade-ve-degisim",
  "icon",
  "kargo-iade",
  "kategori",
  "kayit",
  "mesafeli-satis-sozlesmesi",
  "odeme",
  "on-bilgilendirme-formu",
  "sepet",
  "sifre-yenile",
  "sifremi-unuttum",
  "siparis",
  "urunler",
]);

const SLUG_CACHE_TTL_MS = 5 * 60 * 1000;
const SLUG_CACHE_MAX = 512;

type SlugCacheEntry = { exists: boolean; expiresAt: number };

const slugExistsCache = new Map<string, SlugCacheEntry>();

export function parseLegacyProductSlugCandidate(pathname: string): string | null {
  const raw = pathname.split("?")[0] ?? pathname;
  if (!raw.startsWith("/")) return null;

  const segments = raw.split("/").filter(Boolean);
  if (segments.length !== 1) return null;

  let slug: string;
  try {
    slug = decodeURIComponent(segments[0]).trim();
  } catch {
    return null;
  }

  if (!slug || slug.includes("/") || slug.includes(".")) return null;

  const normalized = slug.toLocaleLowerCase("tr-TR");
  if (RESERVED_ROOT_SEGMENTS.has(normalized)) return null;

  return normalized;
}

function readSlugCache(slug: string): boolean | null {
  const hit = slugExistsCache.get(slug);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    slugExistsCache.delete(slug);
    return null;
  }
  return hit.exists;
}

function writeSlugCache(slug: string, exists: boolean) {
  if (slugExistsCache.size >= SLUG_CACHE_MAX) {
    const oldest = slugExistsCache.keys().next().value;
    if (oldest) slugExistsCache.delete(oldest);
  }
  slugExistsCache.set(slug, { exists, expiresAt: Date.now() + SLUG_CACHE_TTL_MS });
}

/** Aktif ürün slug'ı mı? (RLS: yalnızca is_active = true okunur) */
export async function activeProductSlugExists(slug: string): Promise<boolean> {
  const cached = readSlugCache(slug);
  if (cached !== null) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return false;
  }

  const endpoint = new URL(`${url.replace(/\/+$/, "")}/rest/v1/products`);
  endpoint.searchParams.set("select", "slug");
  endpoint.searchParams.set("slug", `eq.${slug}`);
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("limit", "1");

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    const exists = Array.isArray(rows) && rows.length > 0;
    writeSlugCache(slug, exists);
    return exists;
  } catch {
    return false;
  }
}
