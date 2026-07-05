const PLACEHOLDER_STOCK_CODES = new Set(["merchantsku", "merchant sku", "sku"]);

export function isTrendyolPlaceholderStockCode(value: string): boolean {
  return PLACEHOLDER_STOCK_CODES.has(String(value ?? "").trim().toLowerCase());
}

/** Sipariş satırından eşleştirme anahtarları — önce barcode, sonra gerçek stockCode. */
export function trendyolOrderLineMatchKeys(line: { barcode?: string; stockCode?: string }): string[] {
  const barcode = String(line.barcode ?? "").trim();
  const stockCode = String(line.stockCode ?? "").trim();
  const keys: string[] = [];
  if (barcode) keys.push(barcode);
  if (stockCode && !isTrendyolPlaceholderStockCode(stockCode)) keys.push(stockCode);
  return keys;
}

/** Yerel ürün → Trendyol snapshot/push anahtarları (stockCode öncelikli). */
export function localProductTrendyolMatchKeys(product: {
  trendyol_barcode?: string | null;
  trendyol_stock_code?: string | null;
  sku?: string | null;
}): string[] {
  const stockCode = String(product.trendyol_stock_code ?? "").trim();
  const barcode = String(product.trendyol_barcode ?? "").trim();
  const sku = String(product.sku ?? "").trim();
  return [...new Set([stockCode, barcode, sku].filter(Boolean))];
}

/** Push/create için canonical barkod. */
export function resolveTrendyolOutboundBarcode(product: {
  trendyol_barcode?: string | null;
  trendyol_stock_code?: string | null;
  sku?: string | null;
}): string {
  return (
    String(product.trendyol_barcode ?? "").trim() ||
    String(product.trendyol_stock_code ?? "").trim() ||
    String(product.sku ?? "").trim()
  );
}
