import { buildDhlTrackingUrl } from "@/lib/shipping/dhl";

type TrackingUrlSource = {
  shipping_provider?: string | null;
  shipping_tracking_number?: string | null;
  shipping_label_url?: string | null;
};

/** Müşteri / admin için kargo takip URL'si (DHL numarasından veya kayıtlı linkten). */
export function resolveOrderTrackingUrl(order: TrackingUrlSource): string | null {
  const labelUrl = String(order.shipping_label_url ?? "").trim();
  if (labelUrl && !labelUrl.includes("example.invalid")) {
    if (/tracking|dhl\.com/i.test(labelUrl)) return labelUrl;
  }
  const provider = String(order.shipping_provider ?? "dhl").trim().toLowerCase();
  const trackingNumber = String(order.shipping_tracking_number ?? "").trim();
  if (!trackingNumber) return null;
  if (provider === "dhl" || provider === "") {
    return buildDhlTrackingUrl(trackingNumber);
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
