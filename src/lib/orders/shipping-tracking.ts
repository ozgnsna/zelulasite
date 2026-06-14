/** DHL veya başka kargo sağlayıcısından takip numarası / oluşturulmuş gönderi var mı. */
export function orderHasShippingTracking(
  shippingTrackingNumber: string | null | undefined,
  shippingStatus?: string | null | undefined,
): boolean {
  if (String(shippingTrackingNumber ?? "").trim().length > 0) return true;
  return String(shippingStatus ?? "").trim() === "created";
}
