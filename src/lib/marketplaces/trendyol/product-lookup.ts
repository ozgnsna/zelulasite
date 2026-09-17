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
  name?: string | null;
  color?: string | null;
  stock_quantity?: number | null;
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

/** TR-insensitive normalize for color / name tokens. */
export function normalizeTrMatchToken(value: string): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Ölçü soneki (10, 52, 6.5) — renk değil. */
export function isNumericSizeSuffix(suffix: string): boolean {
  return /^\d+([.,]\d+)?$/.test(String(suffix ?? "").trim());
}

/**
 * Zelula362-11 → Zelula362 (sonek sayısal ölçü).
 * Renk soneklerinde (Zelula232-Pembe) null.
 */
export function extractNumericSizeBaseFromIdentifier(identifier: string): string | null {
  const b = String(identifier ?? "").trim();
  const idx = b.lastIndexOf("-");
  if (idx <= 0 || idx >= b.length - 1) return null;
  const base = b.slice(0, idx).trim();
  const suffix = b.slice(idx + 1).trim();
  if (!base || !isNumericSizeSuffix(suffix)) return null;
  return base;
}

/** Sipariş satırı anahtarlarından ölçü taban barkod/SKU’larını toplar. */
export function collectNumericSizeBasesFromIdentifiers(identifiers: Iterable<string>): string[] {
  const bases = new Set<string>();
  for (const id of identifiers) {
    const base = extractNumericSizeBaseFromIdentifier(id);
    if (base) bases.add(base);
  }
  return [...bases];
}

/**
 * Barkodu taban + renk sonekine ayırır (Zelula267-Altın → base Zelula267, color Altın).
 * Sonek sayısal ölçüyse null (ölçü yolu ayrı).
 */
export function parseTrendyolColorSuffixBarcode(
  barcode: string,
): { base: string; color: string } | null {
  const b = String(barcode ?? "").trim();
  const idx = b.lastIndexOf("-");
  if (idx <= 0 || idx >= b.length - 1) return null;
  const base = b.slice(0, idx).trim();
  const color = b.slice(idx + 1).trim();
  if (!base || !color) return null;
  if (isNumericSizeSuffix(color)) return null;
  return { base, color };
}

function colorMatchesProduct(colorToken: string, product: ProductMatchRow, productNameHint?: string): boolean {
  const want = normalizeTrMatchToken(colorToken);
  if (!want) return false;
  const field = normalizeTrMatchToken(String(product.color ?? ""));
  if (field && (field === want || field.includes(want) || want.includes(field))) return true;
  const name = normalizeTrMatchToken(String(product.name ?? ""));
  if (name && name.includes(want)) return true;
  for (const v of [product.trendyol_barcode, product.trendyol_stock_code, product.sku]) {
    const parsed = parseTrendyolColorSuffixBarcode(String(v ?? ""));
    if (parsed && normalizeTrMatchToken(parsed.color) === want) return true;
  }
  void productNameHint;
  return false;
}

function rowMatchesBase(row: ProductMatchRow, base: string): boolean {
  const b = base.trim();
  if (!b) return false;
  for (const v of [row.sku, row.trendyol_stock_code, row.trendyol_barcode]) {
    const key = String(v ?? "").trim();
    if (!key) continue;
    if (key === b) return true;
    if (key.startsWith(`${b}-`)) return true;
  }
  return false;
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

/**
 * Prefer barcode match, then stockCode; ölçü barkodu (Zelula361-10) ana ürüne düşer.
 * Renk soneki (Zelula267-Altın) burada çözülmez — async color resolver kullanın.
 */
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
    if (parsed && isNumericSizeSuffix(parsed.sizeLabel) && map.has(parsed.baseBarcode)) {
      return map.get(parsed.baseBarcode);
    }
  }
  return undefined;
}

/**
 * Tam eşleşme yoksa: Base-Renk → katalogda taban+renk TEK ürüne denk geliyorsa id.
 * 0 veya >1 aday → undefined (tahmin yok).
 */
export async function resolveProductIdByColorSuffix(
  admin: SupabaseClient,
  barcode: string | null,
  opts?: { productName?: string | null },
): Promise<{ id: string; row: ProductMatchRow } | null> {
  const parsed = parseTrendyolColorSuffixBarcode(String(barcode ?? ""));
  if (!parsed) return null;

  const { base, color } = parsed;
  const likePat = `${base}-%`;
  const [eqSku, likeSku, eqStock, likeStock, eqBarcode, likeBarcode] = await Promise.all([
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .eq("sku", base),
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .like("sku", likePat),
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .eq("trendyol_stock_code", base),
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .like("trendyol_stock_code", likePat),
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .eq("trendyol_barcode", base),
    admin
      .from("products")
      .select("id,sku,name,color,stock_quantity,trendyol_barcode,trendyol_stock_code")
      .like("trendyol_barcode", likePat),
  ]);

  const merged = dedupeById([
    ...((eqSku.data ?? []) as ProductMatchRow[]),
    ...((likeSku.data ?? []) as ProductMatchRow[]),
    ...((eqStock.data ?? []) as ProductMatchRow[]),
    ...((likeStock.data ?? []) as ProductMatchRow[]),
    ...((eqBarcode.data ?? []) as ProductMatchRow[]),
    ...((likeBarcode.data ?? []) as ProductMatchRow[]),
  ]).filter((row) => rowMatchesBase(row, base));

  const colored = merged.filter((row) => colorMatchesProduct(color, row, opts?.productName ?? undefined));
  if (colored.length === 1) {
    return { id: colored[0].id, row: colored[0] };
  }
  return null;
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

  const sizeBases = collectNumericSizeBasesFromIdentifiers(ids);
  const lookupKeys = [...new Set([...ids, ...sizeBases])];

  const [r1, r2, r3] = await Promise.all([
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_barcode", lookupKeys),
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("trendyol_stock_code", lookupKeys),
    admin.from("products").select("id,trendyol_barcode,trendyol_stock_code,sku").in("sku", lookupKeys),
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
 * Renk sonekini de dener.
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
  if (id) return { id };
  const colorHit = await resolveProductIdByColorSuffix(admin, barcode);
  return colorHit ? { id: colorHit.id } : null;
}
