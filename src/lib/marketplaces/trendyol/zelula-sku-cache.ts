import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectZelulaIdentifiersFromOrderLines,
  maxZelulaNumericFromValues,
} from "@/lib/products/zelula-sku-series";

export type ZelulaSkuSeriesCache = {
  orders_max: number;
  orders_scanned_at: string | null;
  last_order_number: string | null;
  last_order_line_sample: string[];
  catalog_max: number;
  catalog_scanned_at: string | null;
};

const EMPTY_CACHE: ZelulaSkuSeriesCache = {
  orders_max: 0,
  orders_scanned_at: null,
  last_order_number: null,
  last_order_line_sample: [],
  catalog_max: 0,
  catalog_scanned_at: null,
};

const SETTINGS_KEY = "zelula_sku_series";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseCacheFromSettings(settings: unknown): ZelulaSkuSeriesCache {
  const root = asRecord(settings);
  const row = asRecord(root?.[SETTINGS_KEY]);
  if (!row) return { ...EMPTY_CACHE };

  const sample = row.last_order_line_sample;
  return {
    orders_max: Math.max(0, Math.floor(Number(row.orders_max ?? 0))),
    orders_scanned_at: row.orders_scanned_at ? String(row.orders_scanned_at) : null,
    last_order_number: row.last_order_number ? String(row.last_order_number) : null,
    last_order_line_sample: Array.isArray(sample)
      ? sample.map((x) => String(x)).filter(Boolean).slice(0, 6)
      : [],
    catalog_max: Math.max(0, Math.floor(Number(row.catalog_max ?? 0))),
    catalog_scanned_at: row.catalog_scanned_at ? String(row.catalog_scanned_at) : null,
  };
}

export function extractLinesFromMarketplaceOrderPayload(
  raw: unknown,
): Array<{ barcode: string; stockCode: string }> {
  const payload = asRecord(raw);
  if (!payload) return [];
  const lines = payload.lines;
  if (!Array.isArray(lines)) return [];
  const out: Array<{ barcode: string; stockCode: string }> = [];
  for (const line of lines) {
    const row = asRecord(line);
    if (!row) continue;
    out.push({
      barcode: String(row.barcode ?? "").trim(),
      stockCode: String(row.stockCode ?? row.merchantSku ?? "").trim(),
    });
  }
  return out;
}

async function fetchIntegrationSettingsRow(admin: SupabaseClient): Promise<{
  id: string;
  settings: unknown;
} | null> {
  const { data } = await admin
    .from("marketplace_integrations")
    .select("id,settings")
    .eq("marketplace", "trendyol")
    .maybeSingle();
  if (!data?.id) return null;
  return { id: String(data.id), settings: data.settings };
}

export async function readZelulaSkuSeriesCache(admin: SupabaseClient): Promise<ZelulaSkuSeriesCache> {
  const row = await fetchIntegrationSettingsRow(admin);
  if (!row) return { ...EMPTY_CACHE };
  return parseCacheFromSettings(row.settings);
}

export async function persistZelulaSkuSeriesCache(
  admin: SupabaseClient,
  patch: Partial<ZelulaSkuSeriesCache>,
): Promise<void> {
  const row = await fetchIntegrationSettingsRow(admin);
  if (!row) return;

  const current = parseCacheFromSettings(row.settings);
  const next: ZelulaSkuSeriesCache = {
    orders_max: patch.orders_max ?? current.orders_max,
    orders_scanned_at: patch.orders_scanned_at ?? current.orders_scanned_at,
    last_order_number: patch.last_order_number ?? current.last_order_number,
    last_order_line_sample: patch.last_order_line_sample ?? current.last_order_line_sample,
    catalog_max: patch.catalog_max ?? current.catalog_max,
    catalog_scanned_at: patch.catalog_scanned_at ?? current.catalog_scanned_at,
  };

  const root = asRecord(row.settings) ?? {};
  const mergedSettings = {
    ...root,
    [SETTINGS_KEY]: next,
  };

  await admin
    .from("marketplace_integrations")
    .update({ settings: mergedSettings, updated_at: new Date().toISOString() })
    .eq("id", row.id);
}

/** Sipariş satırlarından cache günceller; mevcut max ile birleştirir (düşürmez). */
export async function updateZelulaSkuSeriesFromTrendyolOrders(
  admin: SupabaseClient,
  orders: Array<{
    orderNumber: string;
    lines: Array<{ barcode?: string | null; stockCode?: string | null }>;
  }>,
): Promise<void> {
  if (orders.length === 0) return;

  const identifiers: string[] = [];
  for (const order of orders) {
    identifiers.push(...collectZelulaIdentifiersFromOrderLines(order.lines));
  }
  const batchMax = maxZelulaNumericFromValues(identifiers);
  if (batchMax <= 0 && identifiers.length === 0) return;

  const current = await readZelulaSkuSeriesCache(admin);
  const latest = orders[orders.length - 1];
  const latestIds = latest ? collectZelulaIdentifiersFromOrderLines(latest.lines).slice(0, 6) : [];

  await persistZelulaSkuSeriesCache(admin, {
    orders_max: Math.max(current.orders_max, batchMax),
    orders_scanned_at: new Date().toISOString(),
    last_order_number: latest?.orderNumber ? String(latest.orderNumber) : current.last_order_number,
    last_order_line_sample: latestIds.length > 0 ? latestIds : current.last_order_line_sample,
  });
}

export async function updateZelulaSkuSeriesFromCatalogIdentifiers(
  admin: SupabaseClient,
  identifiers: string[],
): Promise<void> {
  const batchMax = maxZelulaNumericFromValues(identifiers);
  if (batchMax <= 0) return;
  const current = await readZelulaSkuSeriesCache(admin);
  await persistZelulaSkuSeriesCache(admin, {
    catalog_max: Math.max(current.catalog_max, batchMax),
    catalog_scanned_at: new Date().toISOString(),
  });
}

const MARKETPLACE_ORDERS_PAGE = 500;

/** Kayıtlı Trendyol siparişlerinden (raw_payload.lines) max Zelula numarası. */
export async function scanMarketplaceOrdersForZelulaMax(
  admin: SupabaseClient,
  opts?: { sinceDays?: number },
): Promise<{
  max: number;
  lastOrderNumber: string | null;
  lineSample: string[];
}> {
  const sinceDays = opts?.sinceDays ?? 120;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from("marketplace_orders")
    .select("external_order_id,raw_payload,updated_at")
    .eq("marketplace", "trendyol")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(MARKETPLACE_ORDERS_PAGE);

  let max = 0;
  let lastOrderNumber: string | null = null;
  let lineSample: string[] = [];

  for (const row of rows ?? []) {
    const lines = extractLinesFromMarketplaceOrderPayload(row.raw_payload);
    const ids = collectZelulaIdentifiersFromOrderLines(lines);
    const rowMax = maxZelulaNumericFromValues(ids);
    if (rowMax > max) {
      max = rowMax;
      lastOrderNumber = String(row.external_order_id ?? "").trim() || null;
      lineSample = ids.slice(0, 6);
    }
  }

  if (!lastOrderNumber && rows && rows.length > 0) {
    lastOrderNumber = String(rows[0]!.external_order_id ?? "").trim() || null;
    const lines = extractLinesFromMarketplaceOrderPayload(rows[0]!.raw_payload);
    lineSample = collectZelulaIdentifiersFromOrderLines(lines).slice(0, 6);
    max = Math.max(max, maxZelulaNumericFromValues(lineSample));
  }

  return { max, lastOrderNumber, lineSample };
}
