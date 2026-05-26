type AnalyticsEventRow = {
  event_name: string | null;
  client_id?: string | null;
  ecommerce?: unknown;
};

type ParsedItem = {
  item_id: string;
  item_name: string;
};

export type DashboardAnalyticsMetrics = {
  visitorsToday: number;
  /** İlk kez kayıt olan tarayıcı profili (bugünden önce hiç olay yok). */
  visitorsNewToday: number;
  /** Daha önce (bugünden önce) siteye gelmiş aynı client_id. */
  visitorsReturningToday: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  conversionRate: number;
  topViewedProducts: Array<{ productId: string; productName: string; views: number }>;
  funnel: {
    view_item: number;
    add_to_cart: number;
    begin_checkout: number;
    purchase: number;
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseItems(ecommerce: unknown): ParsedItem[] {
  const eco = asRecord(ecommerce);
  if (!eco) return [];
  const maybeItems = eco.items;
  if (!Array.isArray(maybeItems)) return [];
  const out: ParsedItem[] = [];
  for (const raw of maybeItems) {
    const row = asRecord(raw);
    if (!row) continue;
    const itemId = String(row.item_id ?? "").trim();
    if (!itemId) continue;
    out.push({
      item_id: itemId,
      item_name: String(row.item_name ?? "Ürün").trim() || "Ürün",
    });
  }
  return out;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function collectVisitorIds(events: AnalyticsEventRow[]): Set<string> {
  const visitors = new Set<string>();
  for (const event of events) {
    const clientId = String(event.client_id ?? "").trim();
    if (clientId) visitors.add(clientId);
  }
  return visitors;
}

export function splitNewAndReturningVisitors(
  todayVisitorIds: ReadonlySet<string>,
  seenBeforeToday: ReadonlySet<string>,
): { visitorsNewToday: number; visitorsReturningToday: number } {
  let returning = 0;
  for (const id of todayVisitorIds) {
    if (seenBeforeToday.has(id)) returning += 1;
  }
  return {
    visitorsNewToday: todayVisitorIds.size - returning,
    visitorsReturningToday: returning,
  };
}

export function buildDashboardAnalyticsMetrics(
  events: AnalyticsEventRow[],
  options?: { clientIdsSeenBeforeToday?: ReadonlySet<string> },
): DashboardAnalyticsMetrics {
  const visitors = collectVisitorIds(events);
  const { visitorsNewToday, visitorsReturningToday } = options?.clientIdsSeenBeforeToday
    ? splitNewAndReturningVisitors(visitors, options.clientIdsSeenBeforeToday)
    : { visitorsNewToday: 0, visitorsReturningToday: 0 };
  let productViews = 0;
  let addToCarts = 0;
  let checkoutStarts = 0;
  let purchases = 0;
  const topViewed = new Map<string, { productName: string; views: number }>();

  for (const event of events) {
    const name = String(event.event_name ?? "");

    if (name === "view_item") {
      productViews += 1;
      for (const item of parseItems(event.ecommerce)) {
        const row = topViewed.get(item.item_id) ?? { productName: item.item_name, views: 0 };
        row.views += 1;
        topViewed.set(item.item_id, row);
      }
      continue;
    }
    if (name === "add_to_cart") {
      addToCarts += 1;
      continue;
    }
    if (name === "begin_checkout") {
      checkoutStarts += 1;
      continue;
    }
    if (name === "purchase") {
      purchases += 1;
      continue;
    }
  }

  return {
    visitorsToday: visitors.size,
    visitorsNewToday,
    visitorsReturningToday,
    productViews,
    addToCarts,
    checkoutStarts,
    purchases,
    conversionRate: pct(purchases, checkoutStarts || productViews),
    topViewedProducts: [...topViewed.entries()]
      .map(([productId, row]) => ({
        productId,
        productName: row.productName,
        views: row.views,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5),
    funnel: {
      view_item: productViews,
      add_to_cart: addToCarts,
      begin_checkout: checkoutStarts,
      purchase: purchases,
    },
  };
}
