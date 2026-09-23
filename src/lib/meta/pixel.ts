"use client";

import {
  bindAdminAnalyticsExclusionListener,
  shouldExcludeStorefrontAnalytics,
} from "@/lib/analytics/admin-session-guard";
import { isAnalyticsExcludedPath } from "@/lib/analytics/excluded-path";
import { getCookieConsent } from "@/lib/cookies/consent";
import {
  metaAddToCartEventId,
  metaInitiateCheckoutEventId,
  metaPageViewEventId,
  metaPurchaseEventId,
  metaViewContentEventId,
} from "@/lib/meta/event-ids";

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn & { callMethod?: FbqFn; queue?: unknown[]; loaded?: boolean };
    _fbq?: FbqFn;
  }
}

type PixelItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
};

let adminGuardBound = false;

function ensureAdminGuardListener() {
  if (typeof window === "undefined" || adminGuardBound) return;
  adminGuardBound = true;
  bindAdminAnalyticsExclusionListener();
}

export function getMetaPixelId(): string {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
}

export function marketingConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  return getCookieConsent()?.marketing === true;
}

function canQueuePixel(): boolean {
  if (typeof window === "undefined") return false;
  if (!getMetaPixelId()) return false;
  if (isAnalyticsExcludedPath(window.location.pathname)) return false;
  if (!marketingConsentGranted()) return false;
  return true;
}

function trackMeta(eventName: string, params: Record<string, unknown>, eventID: string) {
  if (!canQueuePixel() || !eventID) return;
  ensureAdminGuardListener();
  void (async () => {
    if (await shouldExcludeStorefrontAnalytics()) return;
    if (typeof window.fbq !== "function") return;
    window.fbq("track", eventName, params, { eventID });
  })();
}

export function trackMetaPageView(path: string) {
  trackMeta("PageView", {}, metaPageViewEventId(path));
}

export function trackMetaViewContent(item: PixelItem) {
  trackMeta(
    "ViewContent",
    {
      content_ids: [item.product_id],
      content_type: "product",
      content_name: item.product_name,
      value: item.price * item.quantity,
      currency: "TRY",
    },
    metaViewContentEventId(item.product_id),
  );
}

export function trackMetaAddToCart(item: PixelItem) {
  trackMeta(
    "AddToCart",
    {
      content_ids: [item.product_id],
      content_type: "product",
      content_name: item.product_name,
      value: item.price * item.quantity,
      currency: "TRY",
    },
    metaAddToCartEventId(item.product_id),
  );
}

export function trackMetaInitiateCheckout(items: PixelItem[]) {
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  trackMeta(
    "InitiateCheckout",
    {
      content_ids: items.map((item) => item.product_id),
      content_type: "product",
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      value,
      currency: "TRY",
    },
    metaInitiateCheckoutEventId(items),
  );
}

export function trackMetaPurchase(params: {
  transaction_id: string;
  value: number;
  items: PixelItem[];
}) {
  trackMeta(
    "Purchase",
    {
      content_ids: params.items.map((item) => item.product_id),
      content_type: "product",
      num_items: params.items.reduce((sum, item) => sum + item.quantity, 0),
      value: params.value,
      currency: "TRY",
    },
    metaPurchaseEventId(params.transaction_id),
  );
}
