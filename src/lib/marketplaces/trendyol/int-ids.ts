/** Trendyol API tam sayı ID alanları (marka, kategori vb.) — yalnızca pozitif basamak dizisi. */
export function parseTrendyolPositiveIntId(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/** Trendyol v2 ürün gönderimi için https görsel sayısı. */
export function countTrendyolHttpsProductImages(
  rows: { image_url?: string | null }[] | null | undefined,
): number {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((r) => /^https:\/\//i.test(String(r?.image_url ?? "").trim())).length;
}
