/** Ürün görselleri: kapak (is_cover) ve sort_order ile doğru URL seçimi. */

import { isProductVideoUrl } from "@/lib/products/media-url";

export type ProductImageRow = {
  image_url?: string | null;
  is_cover?: boolean | null;
  sort_order?: number | null;
};

export function sortProductImages<T extends ProductImageRow>(imgs: T[] | null | undefined): T[] {
  return [...(imgs ?? [])].sort((a, b) => {
    const ac = Boolean(a.is_cover);
    const bc = Boolean(b.is_cover);
    if (ac !== bc) return ac ? -1 : 1;
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
}

export function pickProductCoverImageUrl(
  imgs: ProductImageRow[] | null | undefined,
  fallback?: string,
): string {
  const sorted = sortProductImages(normalizeProductImages(imgs));
  const still = sorted.find((row) => !isProductVideoUrl(String(row.image_url ?? "")));
  const url = String(still?.image_url ?? "").trim();
  if (url) return url;
  return fallback ?? "";
}

export function pickFirstProductVideoUrl(imgs: ProductImageRow[] | null | undefined): string | null {
  const sorted = sortProductImages(normalizeProductImages(imgs));
  const row = sorted.find((item) => isProductVideoUrl(String(item.image_url ?? "")));
  const url = String(row?.image_url ?? "").trim();
  return url || null;
}

/** Supabase bazen tek satırı dizi yerine nesne döndürebilir; PDP galerisi için güvenli dizi. */
export function normalizeProductImages<T extends ProductImageRow & { id?: string }>(
  raw: T[] | T | null | undefined,
): T[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((row) => String(row?.image_url ?? "").trim().length > 0)
    .map((row, index) => ({
      ...row,
      id: String(row.id ?? "").trim() || `gallery-${index}-${String(row.image_url).slice(-24)}`,
    }));
}
