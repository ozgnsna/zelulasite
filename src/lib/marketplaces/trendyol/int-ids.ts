import { isProductVideoUrl } from "@/lib/products/media-url";

/** Trendyol API tam sayı ID alanları (marka, kategori vb.) — yalnızca pozitif basamak dizisi. */
export function parseTrendyolPositiveIntId(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/** Trendyol v2 create için geçerli fotoğraf URL (https, video değil). */
export function isTrendyolHttpsProductPhotoUrl(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim();
  if (!/^https:\/\//i.test(u)) return false;
  return !isProductVideoUrl(u);
}

/** Trendyol v2 ürün gönderimi için https fotoğraf sayısı (video hariç). */
export function countTrendyolHttpsProductImages(
  rows: { image_url?: string | null }[] | null | undefined,
): number {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((r) => isTrendyolHttpsProductPhotoUrl(String(r?.image_url ?? ""))).length;
}
