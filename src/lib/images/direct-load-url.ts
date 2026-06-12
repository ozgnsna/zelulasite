/** Harici URL'ler Vercel Image Optimization'dan geçmesin (kotası / 402 riski). */
export function shouldUseUnoptimizedImage(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://");
}
