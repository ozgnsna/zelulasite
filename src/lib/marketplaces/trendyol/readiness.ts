import { parseTrendyolPositiveIntId } from "@/lib/marketplaces/trendyol/int-ids";

type ReadinessStatus = "ready" | "missing" | "disabled";

export type TrendyolReadinessInput = {
  is_active: boolean;
  trendyol_active: boolean;
  trendyol_barcode: string | null;
  trendyol_stock_code: string | null;
  sku: string | null;
  trendyol_brand: string | null;
  trendyol_category_id: string | null;
  trendyol_sale_price: number | null;
  trendyol_quantity: number | null;
  stock_quantity: number | null;
  trendyol_vat_rate: number | null;
  /** https ile başlayan ürün görseli sayısı (Trendyol v2 create zorunlu). */
  trendyol_https_image_count?: number;
};
/** When category attribute schema is loaded from cache/API, enforce required attributes. */
export type TrendyolCategoryReadinessInput = {
  resolved: boolean;
  requiredCount: number;
  missingRequired: { attributeId: number; name: string }[];
};

export type TrendyolReadinessResult = {
  status: ReadinessStatus;
  missingFields: string[];
};

export function evaluateTrendyolReadiness(
  p: TrendyolReadinessInput,
  category?: TrendyolCategoryReadinessInput | null,
): TrendyolReadinessResult {
  if (!p.is_active || !p.trendyol_active) {
    return { status: "disabled", missingFields: [] };
  }

  const missingFields: string[] = [];
  const barcode = p.trendyol_barcode?.trim() || p.sku?.trim() || "";
  const stockCode = p.trendyol_stock_code?.trim() || p.sku?.trim() || "";
  const salePrice = Number(p.trendyol_sale_price ?? 0);
  const sharedQuantity = Number(p.stock_quantity ?? 0);
  if (!barcode) missingFields.push("barcode");
  if (!stockCode) missingFields.push("stock_code");
  if (parseTrendyolPositiveIntId(p.trendyol_category_id) == null) missingFields.push("category_id");
  const imgCount = p.trendyol_https_image_count;
  if (imgCount != null && imgCount < 1) missingFields.push("product_images");
  if (!(salePrice > 0)) missingFields.push("sale_price");
  if (!Number.isFinite(sharedQuantity) || sharedQuantity < 0) missingFields.push("quantity");

  if (category?.resolved && category.missingRequired.length > 0) {
    for (const m of category.missingRequired) {
      missingFields.push(`trendyol_zorunlu_özellik:${m.attributeId}`);
    }
  }

  return {
    status: missingFields.length === 0 ? "ready" : "missing",
    missingFields,
  };
}
