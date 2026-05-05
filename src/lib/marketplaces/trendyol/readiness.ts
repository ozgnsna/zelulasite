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
  const barcode = p.trendyol_barcode?.trim() ?? "";
  const stockCode = p.trendyol_stock_code?.trim() || p.sku?.trim() || "";
  const brand = p.trendyol_brand?.trim() ?? "";
  const categoryId = p.trendyol_category_id?.trim() ?? "";
  const salePrice = Number(p.trendyol_sale_price ?? 0);
  const sharedQuantity = Number(p.stock_quantity ?? 0);
  const vatRate = p.trendyol_vat_rate;

  if (!barcode) missingFields.push("barcode");
  if (!stockCode) missingFields.push("stock_code");
  if (!brand) missingFields.push("brand");
  if (!categoryId) missingFields.push("category_id");
  if (!(salePrice > 0)) missingFields.push("sale_price");
  if (!Number.isFinite(sharedQuantity) || sharedQuantity < 0) missingFields.push("quantity");
  if (vatRate == null || Number.isNaN(Number(vatRate))) missingFields.push("vat_rate");

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
