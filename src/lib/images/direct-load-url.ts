/** Supabase Storage public object URL — safe to route through /_next/image. */
export function isSupabaseStorageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".supabase.co") && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/**
 * Harici URL'ler doğrudan yüklenir (Vercel Image Optimization kotası / 402 riski).
 * Supabase dahil — /_next/image üzerinden yükleme prod'da kırılabiliyor.
 */
export function shouldUseUnoptimizedImage(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  return true;
}
