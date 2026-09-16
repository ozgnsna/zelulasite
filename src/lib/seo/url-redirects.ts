/**
 * url_redirects tablosu — proxy önbelleği (10 dk) ve slug değişiminde zincir sıkıştırma.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type UrlRedirectStatus = 301 | 308 | 410;

export type UrlRedirectRow = {
  from_path: string;
  to_path: string;
  status_code: UrlRedirectStatus;
};

export type ResolvedUrlRedirect =
  | { kind: "gone"; status: 410 }
  | { kind: "redirect"; toPath: string; status: 301 | 308 };

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CHAIN_DEPTH = 5;

let cacheMap: Map<string, UrlRedirectRow> | null = null;
let cacheExpiresAt = 0;

function normalizePathname(pathname: string): string {
  const raw = pathname.split("?")[0] ?? pathname;
  if (!raw.startsWith("/")) return `/${raw}`;
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

function productPath(slug: string): string {
  return `/urunler/${slug.trim()}`;
}

export function invalidateUrlRedirectCache() {
  cacheMap = null;
  cacheExpiresAt = 0;
}

export async function getUrlRedirectMap(): Promise<Map<string, UrlRedirectRow>> {
  if (cacheMap && Date.now() < cacheExpiresAt) return cacheMap;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("url_redirects")
    .select("from_path,to_path,status_code");

  if (error) {
    console.error("[url-redirects] load failed", error.message);
    cacheMap = new Map();
    cacheExpiresAt = Date.now() + Math.min(CACHE_TTL_MS, 30_000);
    return cacheMap;
  }

  const map = new Map<string, UrlRedirectRow>();
  for (const row of data ?? []) {
    const from_path = normalizePathname(String(row.from_path ?? ""));
    const to_path = normalizePathname(String(row.to_path ?? ""));
    const status_code = Number(row.status_code) as UrlRedirectStatus;
    if (!from_path.startsWith("/") || !to_path.startsWith("/")) continue;
    if (status_code !== 301 && status_code !== 308 && status_code !== 410) continue;
    map.set(from_path, { from_path, to_path, status_code });
  }

  cacheMap = map;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return map;
}

export async function resolveUrlRedirect(pathname: string): Promise<ResolvedUrlRedirect | null> {
  const start = normalizePathname(pathname);
  let map: Map<string, UrlRedirectRow>;
  try {
    map = await getUrlRedirectMap();
  } catch (err) {
    console.error("[url-redirects] map unavailable", err instanceof Error ? err.message : err);
    return null;
  }

  const first = map.get(start);
  if (!first) return null;

  if (first.status_code === 410) {
    return { kind: "gone", status: 410 };
  }

  let current = first;
  let toPath = current.to_path;
  const status: 301 | 308 = current.status_code === 308 ? 308 : 301;
  const seen = new Set<string>([start]);

  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
    if (seen.has(toPath)) break;
    const next = map.get(toPath);
    if (!next || next.status_code === 410) break;
    seen.add(toPath);
    toPath = next.to_path;
    current = next;
  }

  if (toPath === start) return null;
  return { kind: "redirect", toPath, status };
}

/**
 * Slug değişiminde: zincir sıkıştır, yeni slug'tan gelen yönlendirmeyi sil,
 * eski slug → yeni slug 301 yaz.
 */
export async function upsertProductSlugRedirect(
  admin: SupabaseClient,
  oldSlug: string,
  newSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const oldPath = productPath(oldSlug);
  const newPath = productPath(newSlug);
  if (!oldSlug.trim() || !newSlug.trim()) {
    return { ok: false, error: "slug boş olamaz" };
  }
  if (oldPath === newPath) {
    return { ok: false, error: "slug değişmedi" };
  }

  // Zincir: … → oldPath  ⇒  … → newPath
  await admin.from("url_redirects").update({ to_path: newPath }).eq("to_path", oldPath);

  // Yeni ürün yolu başka bir yerden yönlendirme kaynağı olmasın
  await admin.from("url_redirects").delete().eq("from_path", newPath);

  const { error } = await admin.from("url_redirects").upsert(
    {
      from_path: oldPath,
      to_path: newPath,
      status_code: 301,
      note: "product slug change",
    },
    { onConflict: "from_path" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  invalidateUrlRedirectCache();
  return { ok: true };
}

export async function deleteRedirectFromPath(admin: SupabaseClient, fromPath: string) {
  await admin.from("url_redirects").delete().eq("from_path", normalizePathname(fromPath));
  invalidateUrlRedirectCache();
}
