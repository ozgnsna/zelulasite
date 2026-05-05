export type ProductRowPriority = "critical" | "needs_improvement" | "healthy";

export function isListedOnTrendyol(p: {
  is_active: boolean | null;
  trendyol_active: boolean | null;
  trendyol_barcode: string | null | undefined;
  trendyol_stock_code: string | null | undefined;
  trendyol_category_id: string | null | undefined;
  sku: string | null | undefined;
}): boolean {
  if (!Boolean(p.is_active)) return false;
  if (!Boolean(p.trendyol_active)) return false;
  const sku = String(p.sku ?? "").trim();
  const categoryId = String(p.trendyol_category_id ?? "").trim();
  const barcode = String(p.trendyol_barcode ?? "").trim();
  const stockCode = String(p.trendyol_stock_code ?? "").trim();
  return Boolean(sku && categoryId && barcode && stockCode);
}

export function classifyProductSalesRow(input: {
  stock: number;
  isActive: boolean;
  listedOnMarketplace: boolean;
  salesQty: number;
}): ProductRowPriority {
  const { stock, isActive, listedOnMarketplace, salesQty } = input;
  if (stock === 0 || (isActive && !listedOnMarketplace)) return "critical";
  if (isActive && listedOnMarketplace && stock > 0 && salesQty > 0) return "healthy";
  return "needs_improvement";
}

export function buildProductListSuggestion(input: {
  priority: ProductRowPriority;
  stock: number;
  isActive: boolean;
  listedOnMarketplace: boolean;
  salesQty: number;
  views: number;
  hasCoverImage: boolean;
  importedNeedsReview: boolean;
}): string {
  if (input.importedNeedsReview) return "İnceleme: içeriği netleştirip vitrine al.";
  if (input.stock === 0) return "Stok bitti — yenilemeden satış olmaz.";
  if (input.isActive && !input.listedOnMarketplace) return "Pazaryerinde yok → Trendyol'a gönder veya alanları tamamla.";
  if (!input.hasCoverImage) return "Kapak görseli yok → tıklama ve güven düşer; görsel ekle.";
  if (input.isActive && input.salesQty === 0 && input.views >= 8)
    return "Görüntüleniyor ama bu ürün satmıyor → fiyat veya görseli güçlendir.";
  if (input.isActive && input.salesQty === 0 && input.views < 8)
    return "Bu ürün satmıyor → fiyatı gözden geçir veya vitrin / Trendyol görünürlüğünü artır.";
  if (input.priority === "healthy") return "Satış akıyor — stok ve fiyatı koru.";
  return "Pasif veya vitrin dışı — satış için aktifleştir ve vitrin koşullarını tamamla.";
}

export function parseViewItemProductIdFromEcommerce(ecommerce: unknown): string | null {
  if (!ecommerce || typeof ecommerce !== "object") return null;
  const items = (ecommerce as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const first = items[0];
  if (!first || typeof first !== "object") return null;
  const id = (first as { item_id?: unknown }).item_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function computePopularSalesThreshold(salesByProduct: Map<string, number>): number {
  const values = [...salesByProduct.values()].filter((n) => n > 0).sort((a, b) => b - a);
  if (values.length === 0) return 1;
  const idx = Math.max(0, Math.floor(values.length * 0.15) - 1);
  const t = values[idx] ?? values[values.length - 1] ?? 1;
  return Math.max(t, 2);
}
