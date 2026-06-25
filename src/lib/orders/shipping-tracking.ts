import { buildDhlTrackingUrl } from "@/lib/shipping/dhl";
import type { ShippingCarrierId } from "@/lib/shipping/types";

type TrackingUrlSource = {
  shipping_provider?: string | null;
  shipping_tracking_number?: string | null;
  shipping_label_url?: string | null;
};

function normalizeProvider(raw: string | null | undefined): ShippingCarrierId | "other" {
  const p = String(raw ?? "").trim().toLowerCase();
  if (p === "dhl") return "dhl";
  if (p === "navlungo") return "navlungo";
  return "other";
}

function isLikelyTrackingUrl(url: string): boolean {
  if (!url || url.includes("example.invalid")) return false;
  if (/\.pdf(\?|$)/i.test(url)) return false;
  return /tracking|takip|dhl\.com|navlungo|kargo|cargo/i.test(url);
}

/** Manuel kayıt veya müşteri takip linki için URL üretir. */
export function resolveTrackingUrlForProvider(
  provider: string | null | undefined,
  trackingNumber: string,
  customUrl?: string | null,
): string | null {
  const url = String(customUrl ?? "").trim();
  if (url) return url;
  const id = String(trackingNumber ?? "").trim();
  if (!id) return null;
  const p = normalizeProvider(provider);
  if (p === "dhl" || p === "other") {
    return buildDhlTrackingUrl(id);
  }
  return null;
}

/** Müşteri / admin için kargo takip URL'si. */
export function resolveOrderTrackingUrl(order: TrackingUrlSource): string | null {
  const labelUrl = String(order.shipping_label_url ?? "").trim();
  if (labelUrl && isLikelyTrackingUrl(labelUrl)) {
    return labelUrl;
  }

  const provider = normalizeProvider(order.shipping_provider);
  const trackingNumber = String(order.shipping_tracking_number ?? "").trim();
  if (!trackingNumber) return null;

  if (provider === "dhl" || provider === "other") {
    return buildDhlTrackingUrl(trackingNumber);
  }

  if (provider === "navlungo" && labelUrl && !labelUrl.includes("example.invalid")) {
    return labelUrl;
  }

  return null;
}

/** DHL veya başka kargo sağlayıcısından takip numarası / oluşturulmuş gönderi var mı. */
export function orderHasShippingTracking(
  shippingTrackingNumber: string | null | undefined,
  shippingStatus?: string | null | undefined,
): boolean {
  if (String(shippingTrackingNumber ?? "").trim().length > 0) return true;
  return String(shippingStatus ?? "").trim() === "created";
}
