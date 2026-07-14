import type { ProductVariant } from "@/lib/types";
import { resolveTrendyolOutboundBarcode } from "@/lib/marketplaces/trendyol/product-identifiers";

/** Yüzük kategorisinde Trendyol «beden/ölçü» özelliği (kategori 2841). */
export const TRENDYOL_RING_SIZE_ATTRIBUTE_ID = 338;

export type TrendyolVariantSource = {
  trendyol_barcode?: string | null;
  trendyol_stock_code?: string | null;
  sku?: string | null;
};

/** Örn. Zelula361 + 10 → Zelula361-10 */
export function buildTrendyolVariantBarcode(baseBarcode: string, sizeLabel: string): string {
  const base = String(baseBarcode ?? "").trim();
  const size = String(sizeLabel ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  if (!base || !size) return base;
  return `${base}-${size}`;
}

export function resolveTrendyolProductMainId(product: TrendyolVariantSource): string {
  return (
    String(product.trendyol_stock_code ?? "").trim() ||
    String(product.trendyol_barcode ?? "").trim() ||
    String(product.sku ?? "").trim()
  );
}

export function resolveTrendyolBaseBarcode(product: TrendyolVariantSource): string {
  return resolveTrendyolOutboundBarcode(product);
}

/** TY sipariş / stok eşlemesi: Zelula361-10 → { base: Zelula361, sizeLabel: 10 } */
export function parseTrendyolVariantBarcode(
  barcode: string,
  knownBaseBarcodes: Iterable<string>,
): { baseBarcode: string; sizeLabel: string } | null {
  const b = String(barcode ?? "").trim();
  if (!b) return null;
  let best: { baseBarcode: string; sizeLabel: string } | null = null;
  for (const base of knownBaseBarcodes) {
    const prefix = `${base}-`;
    if (!b.startsWith(prefix) || b.length <= prefix.length) continue;
    const sizeLabel = b.slice(prefix.length);
    if (!sizeLabel) continue;
    if (!best || base.length > best.baseBarcode.length) {
      best = { baseBarcode: base, sizeLabel };
    }
  }
  return best;
}

export function withTrendyolRingSizeAttribute(
  attributes: unknown,
  sizeLabel: string,
  attributeId = TRENDYOL_RING_SIZE_ATTRIBUTE_ID,
): unknown[] {
  const list = Array.isArray(attributes)
    ? attributes.filter((x) => x && typeof x === "object").map((x) => ({ ...(x as Record<string, unknown>) }))
    : [];
  const size = String(sizeLabel ?? "").trim();
  if (!size) return list;
  const idx = list.findIndex((row) => Number(row.attributeId ?? 0) === attributeId);
  const next = { attributeId, customAttributeValue: size };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.push(next);
  return list;
}

export function activeTrendyolVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter((v) => v.is_active !== false && String(v.label ?? "").trim().length > 0);
}

export function shouldExpandTrendyolVariants(variants: ProductVariant[]): boolean {
  return activeTrendyolVariants(variants).length > 0;
}

export type TrendyolVariantExpansion = {
  barcode: string;
  stockCode: string;
  quantity: number;
  sizeLabel: string;
  variantId: string | null;
};

/** Site ölçü satırları → Trendyol barkod/stok/adet listesi. */
export function expandTrendyolVariantRows(
  product: TrendyolVariantSource,
  variants: ProductVariant[],
): TrendyolVariantExpansion[] {
  const baseBarcode = resolveTrendyolBaseBarcode(product);
  const mainId = resolveTrendyolProductMainId(product);
  if (!baseBarcode || !mainId) return [];

  return activeTrendyolVariants(variants).map((v) => {
    const sizeLabel = String(v.label).trim();
    const barcode = buildTrendyolVariantBarcode(baseBarcode, sizeLabel);
    return {
      barcode,
      stockCode: `${mainId}-${sizeLabel}`,
      quantity: Math.max(0, Math.floor(Number(v.stock_quantity ?? 0))),
      sizeLabel,
      variantId: v.id || null,
    };
  });
}
