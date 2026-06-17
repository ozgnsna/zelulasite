import { createDhlShipment } from "@/lib/shipping/dhl";
import { createNavlungoShipment } from "@/lib/shipping/navlungo";
import type { CreateShipmentResult, OrderShippingSource, ShippingCarrierId } from "@/lib/shipping/types";

/** Aktif kargo sağlayıcısı — env ile seçilir; Navlungo kimlik bilgisi varsa varsayılan navlungo. */
export function getConfiguredShippingCarrier(): ShippingCarrierId {
  const explicit = process.env.SHIPPING_CARRIER?.trim().toLowerCase();
  if (explicit === "dhl" || explicit === "navlungo") return explicit;
  if (process.env.NAVLUNGO_API_USERNAME?.trim() && process.env.NAVLUNGO_API_PASSWORD?.trim()) {
    return "navlungo";
  }
  return "dhl";
}

export function getShippingCarrierLabel(): string {
  return getConfiguredShippingCarrier() === "navlungo" ? "Navlungo" : "DHL";
}

export async function createShipmentForOrder(order: OrderShippingSource): Promise<CreateShipmentResult> {
  const carrier = getConfiguredShippingCarrier();
  if (carrier === "navlungo") {
    return createNavlungoShipment(order);
  }
  return createDhlShipment(order);
}
