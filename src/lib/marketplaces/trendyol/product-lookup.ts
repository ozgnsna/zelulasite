import type { SupabaseClient } from "@supabase/supabase-js";
import {
  expandTrendyolVariantRows,
  parseTrendyolVariantBarcode,
} from "@/lib/marketplaces/trendyol/product-variants";
import type { ProductVariant } from "@/lib/types";

type ProductMatchRow = {
  id: string;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  sku: string | null;
};

function dedupeById(rows: ProductMatchRow[]): ProductMatchRow[] {
  const seen = new Set<string>();
  const out: ProductMatchRow[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

/** Maps exact identifier string → product id (first column hit wins per row order). */
export function buildTrendyolIdentifierToProductIdMap(rows: ProductMatchRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    for (const v of [r.trendyol_barcode, r.trendyol_stock_code, r.sku]) {
      const key = v?.trim();
      if (key && !m.has(key)) m.set(key, r.id);
    }
  }
  return m;
}

/** Prefer barcode match, then stockCode; ölçü barkodu (Zelula361-10) ana ürüne düşer. */
export function resolveProductIdForTrendyolIdentifiers(
  map: Map<string, string>,
  barcode: string | null,
  stockCode: string | null,
): string | undefined {
  const b = barcode?.trim() || "";
  const s = stockCode?.trim() || "";
  if (b && map.has(b)) return map.get(b);
  if (s && map.has(s)) return map.get(s);
  if (b) {
    const parsed = parseTrendyolVariantBarcode(b, map.keys());
    if (parsed && map.has(parsed.baseBarcode)) return map.get(parsed.baseBarcode);
  }
  return undefined;
}

/** Ölçü barkodlarını (Zelula361-10) ana ürün id’sine bağlar. */
export function enrichTrendyolMapWithVariantBarcodes(
  map: Map<string, string>,
  rows: ProductMatchRow[],
  variantsByProduct: Map<string, ProductVariant[]>,
): void {
  for (const r of rows) {
    const variants = variantsByProduct.get(r.id) ?? [];
    for (const row of expandTrendyolVariantRows(r, variants)) {
      if (!map.has(row.barcode)) map.set(row.barcode, r.id);
      if (!map.has(row.stockCode)) map.set(row.stockCode, r.id);
    }
  }
}

export async function buildTrendyolIdentifierToProductIdMapFromIdentifiers(
  admin: SupabaseClient,
  identifiers: Iterable<string>,
): Promise<Map<string, string>> {
  const ids = [...new Set([...identifiers].map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const [r1, r2, r3] = await Promise.all([
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_barcode", ids),
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_stock_code", ids),
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("sku", ids),
  ]);

  const merged = dedupeById([
    ...((r1.data ?? []) as ProductMatchRow[]),
    ...((r2.data ?? []) as ProductMatchRow[]),
    ...((r3.data ?? []) as ProductMatchRow[]),
  ]);
  return buildTrendyolIdentifierToProductIdMap(merged);
}

/**
 * Resolve a local product by Trendyol outbound identifiers (barcode / stock code / sku).
 */
export async function findLocalProductByTrendyolIdentifiers(
  admin: SupabaseClient,
  barcode: string | null,
  stockCode: string | null,
): Promise<{ id: string } | null> {
  const b = barcode?.trim() || "";
  const s = stockCode?.trim() || "";
  if (!b && !s) return null;
  const map = await buildTrendyolIdentifierToProductIdMapFromIdentifiers(admin, [b, s]);
  const id = resolveProductIdForTrendyolIdentifiers(map, barcode, stockCode);
  return id ? { id } : null;
}
