"use client";

import { getCookieConsent } from "@/lib/cookies/consent";

type Primitive = string | number | boolean | null | undefined;
type EventParams = Record<
  string,
  Primitive | Primitive[] | Record<string, unknown> | unknown[]
>;

export type AnalyticsItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  category?: string;
  collection?: string | null;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const seenEvents = new Set<string>();

function isDebug() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true"
  );
}

function analyticsConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  return getCookieConsent()?.analytics === true;
}

function eventKey(name: string, params: EventParams) {
  return `${name}:${JSON.stringify(params)}`;
}

function shouldSkipDuplicate(name: string, params: EventParams, dedupe?: string) {
  const key = dedupe ?? eventKey(name, params);
  if (seenEvents.has(key)) return true;
  seenEvents.add(key);

  if (typeof window !== "undefined") {
    const storageKey = `zelula_analytics_${key}`;
    if (sessionStorage.getItem(storageKey)) return true;
    sessionStorage.setItem(storageKey, "1");
  }
  return false;
}

function getClientId() {
  if (typeof window === "undefined") return "";
  const key = "zelula_client_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `cid_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  localStorage.setItem(key, id);
  return id;
}

function sendToBackend(event_name: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    event_name,
    occurred_at: new Date().toISOString(),
    page_path: window.location.pathname,
    client_id: getClientId(),
    ...payload,
  });

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    if (isDebug()) console.warn("[analytics] backend track failed", event_name);
  });
}

export function trackEvent(
  name: string,
  params: EventParams = {},
  options?: { dedupeKey?: string; dedupe?: boolean },
) {
  if (typeof window === "undefined") return;
  if (!analyticsConsentGranted()) {
    if (isDebug()) console.info("[analytics:skipped]", name, "analytics consent off or unset");
    return;
  }
  const shouldDedupe = options?.dedupe ?? false;
  if (shouldDedupe && shouldSkipDuplicate(name, params, options?.dedupeKey)) return;

  if (isDebug()) console.info("[analytics:event]", name, params);
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
  sendToBackend(name, { meta: params });
}

type Ga4Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_category2?: string;
};

type ChannelSource = "instagram" | "whatsapp" | "trendyol";

function toGa4Item(item: AnalyticsItem): Ga4Item {
  return {
    item_id: item.product_id,
    item_name: item.product_name,
    price: item.price,
    quantity: item.quantity,
    item_category: item.category,
    item_category2: item.collection ?? undefined,
  };
}

function trackEcommerceEvent(
  name: string,
  params: {
    currency?: "TRY";
    value?: number;
    items: AnalyticsItem[];
    transaction_id?: string;
    item_list_name?: string;
    item_list_id?: string;
    tax?: number;
    shipping?: number;
  },
  options?: { dedupeKey?: string; dedupe?: boolean },
) {
  if (typeof window === "undefined") return;
  if (!analyticsConsentGranted()) {
    if (isDebug()) console.info("[analytics:skipped]", name, "analytics consent off or unset");
    return;
  }
  const shouldDedupe = options?.dedupe ?? false;
  if (shouldDedupe && shouldSkipDuplicate(name, params as EventParams, options?.dedupeKey)) return;

  const ga4Items = params.items.map(toGa4Item);
  const ecommerce = {
    currency: params.currency ?? "TRY",
    value: params.value,
    transaction_id: params.transaction_id,
    item_list_name: params.item_list_name,
    item_list_id: params.item_list_id,
    tax: params.tax,
    shipping: params.shipping,
    items: ga4Items,
  };

  if (isDebug()) console.info("[analytics:ecommerce]", name, ecommerce);
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ecommerce });

  if (typeof window.gtag === "function") {
    // gtag event paramlarını GA4 formatında düz geçiriyoruz.
    window.gtag("event", name, ecommerce);
  }
  sendToBackend(name, { ecommerce });
}

export function trackPageView(path: string) {
  trackEvent("page_view", { page_path: path }, { dedupeKey: `pv:${path}`, dedupe: true });
}

export function trackViewItem(item: AnalyticsItem) {
  trackEcommerceEvent(
    "view_item",
    {
      currency: "TRY",
      value: item.price * item.quantity,
      items: [item],
    },
    { dedupeKey: `view_item:${item.product_id}`, dedupe: true },
  );
}

export function trackViewItemList(
  listName: string,
  items: AnalyticsItem[],
  listId?: string,
) {
  trackEcommerceEvent(
    "view_item_list",
    {
      currency: "TRY",
      item_list_name: listName,
      item_list_id: listId ?? listName.toLowerCase().replace(/\s+/g, "_"),
      items,
    },
    { dedupeKey: `view_item_list:${listName}:${items.map((x) => x.product_id).join(",")}`, dedupe: true },
  );
}

export function trackAddToCart(item: AnalyticsItem) {
  trackEcommerceEvent("add_to_cart", {
    currency: "TRY",
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackRemoveFromCart(item: AnalyticsItem) {
  trackEcommerceEvent("remove_from_cart", {
    currency: "TRY",
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[]) {
  const value = items.reduce((s, i) => s + i.price * i.quantity, 0);
  trackEcommerceEvent(
    "begin_checkout",
    { currency: "TRY", value, items },
    { dedupeKey: `begin_checkout:${items.map((x) => `${x.product_id}:${x.quantity}`).join("|")}`, dedupe: true },
  );
}

export function trackPurchase(params: {
  transaction_id: string;
  value: number;
  tax?: number;
  shipping?: number;
  items: AnalyticsItem[];
}) {
  trackEcommerceEvent(
    "purchase",
    { currency: "TRY", ...params },
    { dedupeKey: `purchase:${params.transaction_id}`, dedupe: true },
  );
}

export function trackInstagramClick(params: { location: string; href?: string }) {
  trackEvent("instagram_click", {
    channel: "instagram" satisfies ChannelSource,
    location: params.location,
    href: params.href,
  });
}

export function trackWhatsAppClick(params: { location: string; href?: string }) {
  trackEvent("whatsapp_click", {
    channel: "whatsapp" satisfies ChannelSource,
    location: params.location,
    href: params.href,
  });
}

export function trackTrendyolRedirect(params: { location: string; href?: string }) {
  trackEvent("trendyol_redirect", {
    channel: "trendyol" satisfies ChannelSource,
    location: params.location,
    href: params.href,
  });
}

export function trackSearchUsage(params: {
  query: string;
  location: string;
  results_count?: number;
  filters?: Record<string, string | number | boolean | null | undefined>;
}) {
  const q = params.query.trim();
  if (!q) return;
  trackEvent(
    "search_usage",
    {
      query: q,
      location: params.location,
      results_count: params.results_count,
      filters: params.filters,
    },
    { dedupeKey: `search:${params.location}:${q}:${params.results_count ?? ""}`, dedupe: true },
  );
}

export function trackCategoryClick(params: { category: string; location: string; href?: string }) {
  const category = params.category.trim();
  if (!category) return;
  trackEvent("category_click", {
    category,
    location: params.location,
    href: params.href,
  });
}

export function trackCouponUsage(params: {
  code: string;
  discount_amount: number;
  percent?: number;
  subtotal_before_discount: number;
  subtotal_after_discount: number;
}) {
  const code = params.code.trim().toUpperCase();
  if (!code) return;
  trackEvent(
    "coupon_usage",
    {
      coupon: code,
      discount_amount: params.discount_amount,
      percent: params.percent,
      subtotal_before_discount: params.subtotal_before_discount,
      subtotal_after_discount: params.subtotal_after_discount,
      currency: "TRY",
      value: params.subtotal_after_discount,
    },
    { dedupeKey: `coupon:${code}:${params.subtotal_after_discount}`, dedupe: true },
  );
}
