import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readZelulaSkuSeriesCache,
  scanMarketplaceOrdersForZelulaMax,
} from "@/lib/marketplaces/trendyol/zelula-sku-cache";
import {
  maxZelulaNumericFromValues,
  suggestNextZelulaSku,
} from "@/lib/products/zelula-sku-series";

export type SuggestedZelulaSkuResult = {
  suggested: string;
  siteMax: number;
  ordersMax: number;
  catalogMax: number;
  effectiveMax: number;
  lastOrderNumber: string | null;
  ordersScannedAt: string | null;
  lastOrderLineSample: string[];
};

async function fetchSiteZelulaMax(admin: SupabaseClient): Promise<number> {
  const values: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await admin
      .from("products")
      .select("sku,trendyol_barcode")
      .range(offset, offset + pageSize - 1);
    if (error) break;
    const batch = data ?? [];
    for (const row of batch) {
      if (row.sku) values.push(String(row.sku));
      if (row.trendyol_barcode) values.push(String(row.trendyol_barcode));
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return maxZelulaNumericFromValues(values);
}

export async function fetchSuggestedZelulaSku(admin: SupabaseClient): Promise<SuggestedZelulaSkuResult> {
  const [siteMax, cache, ordersScan] = await Promise.all([
    fetchSiteZelulaMax(admin),
    readZelulaSkuSeriesCache(admin),
    scanMarketplaceOrdersForZelulaMax(admin, { sinceDays: 120 }),
  ]);

  const ordersMax = Math.max(cache.orders_max, ordersScan.max);
  const catalogMax = cache.catalog_max;
  const effectiveMax = Math.max(siteMax, ordersMax, catalogMax);

  const lastOrderNumber = ordersScan.lastOrderNumber ?? cache.last_order_number;
  const lastOrderLineSample =
    ordersScan.lineSample.length > 0 ? ordersScan.lineSample : cache.last_order_line_sample;

  return {
    suggested: suggestNextZelulaSku(effectiveMax),
    siteMax,
    ordersMax,
    catalogMax,
    effectiveMax,
    lastOrderNumber,
    ordersScannedAt: cache.orders_scanned_at,
    lastOrderLineSample,
  };
}
