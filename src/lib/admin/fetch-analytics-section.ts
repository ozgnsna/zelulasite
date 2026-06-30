import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDashboardAnalyticsMetrics, type DashboardAnalyticsMetrics } from "@/lib/admin/analytics-dashboard";
import type { ResolvedAnalyticsRange } from "@/lib/admin/analytics-range";
import { pickProductCoverImageUrl } from "@/lib/products/cover-image";

type AnalyticsEventRow = {
  event_name: string | null;
  client_id?: string | null;
  ecommerce?: unknown;
};

type OrderRow = {
  total?: number | null;
  payment_status?: string | null;
  order_status?: string | null;
};

const ANALYTICS_PAGE_SIZE = 1000;

async function fetchAnalyticsEventsInRange(
  admin: SupabaseClient,
  start: Date,
  end: Date,
): Promise<AnalyticsEventRow[]> {
  const rows: AnalyticsEventRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from("analytics_events")
      .select("event_name,client_id,ecommerce")
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: true })
      .range(offset, offset + ANALYTICS_PAGE_SIZE - 1);

    if (error) break;

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < ANALYTICS_PAGE_SIZE) break;
    offset += ANALYTICS_PAGE_SIZE;
  }

  return rows;
}

async function fetchOrdersInRange(admin: SupabaseClient, start: Date, end: Date): Promise<OrderRow[]> {
  const rows: OrderRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from("orders")
      .select("id,total,payment_status,order_status")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + ANALYTICS_PAGE_SIZE - 1);

    if (error) break;

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < ANALYTICS_PAGE_SIZE) break;
    offset += ANALYTICS_PAGE_SIZE;
  }

  return rows;
}

function sumPaidRevenue(orders: OrderRow[]): number {
  return orders
    .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
}

function countPaidOrders(orders: OrderRow[]): number {
  return orders.filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled").length;
}

export type AnalyticsSectionData = {
  range: ResolvedAnalyticsRange;
  metrics: DashboardAnalyticsMetrics;
  previousMetrics: DashboardAnalyticsMetrics;
  revenue: number;
  previousRevenue: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;
  paidOrderCount: number;
  productImages: Record<string, string>;
  customFromYmd: string;
  customToYmd: string;
};

export async function fetchAnalyticsSectionData(
  admin: SupabaseClient,
  range: ResolvedAnalyticsRange,
): Promise<AnalyticsSectionData> {
  const [currentEvents, previousEvents, currentOrders, previousOrders] = await Promise.all([
    fetchAnalyticsEventsInRange(admin, range.start, range.end),
    fetchAnalyticsEventsInRange(admin, range.compareStart, range.compareEnd),
    fetchOrdersInRange(admin, range.start, range.end),
    fetchOrdersInRange(admin, range.compareStart, range.compareEnd),
  ]);

  const metrics = buildDashboardAnalyticsMetrics(currentEvents);
  const previousMetrics = buildDashboardAnalyticsMetrics(previousEvents);

  const revenue = sumPaidRevenue(currentOrders);
  const previousRevenue = sumPaidRevenue(previousOrders);
  const paidOrderCount = countPaidOrders(currentOrders);
  const previousPaidCount = countPaidOrders(previousOrders);
  const averageOrderValue = paidOrderCount > 0 ? revenue / paidOrderCount : 0;
  const previousAverageOrderValue = previousPaidCount > 0 ? previousRevenue / previousPaidCount : 0;

  const productIds = metrics.topViewedProducts.map((p) => p.productId);
  const productImages: Record<string, string> = {};

  if (productIds.length > 0) {
    const { data: imageRows } = await admin
      .from("products")
      .select("id, product_images(image_url, is_cover, sort_order)")
      .in("id", productIds);

    for (const row of imageRows ?? []) {
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      const url = pickProductCoverImageUrl(
        row.product_images as { image_url?: string | null; is_cover?: boolean | null; sort_order?: number | null }[],
      );
      if (url) productImages[id] = url;
    }
  }

  const startYmd = range.start.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const endYmd = range.end.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

  return {
    range,
    metrics,
    previousMetrics,
    revenue,
    previousRevenue,
    averageOrderValue,
    previousAverageOrderValue,
    paidOrderCount,
    productImages,
    customFromYmd: startYmd,
    customToYmd: endYmd,
  };
}
