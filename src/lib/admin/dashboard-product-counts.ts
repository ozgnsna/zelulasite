import type { SupabaseClient } from "@supabase/supabase-js";
import { isListedOnTrendyol } from "@/lib/admin/products-list-sales";

export type DashboardProductCounts = {
  activeProductsCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  notListedOnMarketplaceCount: number;
};

export async function fetchDashboardProductCounts(
  admin: SupabaseClient,
): Promise<DashboardProductCounts> {
  const [activeRes, outOfStockRes, lowStockRes, activeCatalogRes] = await Promise.all([
    admin.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("stock_quantity", 0),
    admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .lte("stock_quantity", 3),
    admin
      .from("products")
      .select("is_active,trendyol_active,trendyol_barcode,trendyol_stock_code,trendyol_category_id,sku")
      .eq("is_active", true),
  ]);

  const notListedOnMarketplaceCount = (activeCatalogRes.data ?? []).filter(
    (p) => !isListedOnTrendyol(p),
  ).length;

  return {
    activeProductsCount: activeRes.count ?? 0,
    outOfStockCount: outOfStockRes.count ?? 0,
    lowStockCount: lowStockRes.count ?? 0,
    notListedOnMarketplaceCount,
  };
}
