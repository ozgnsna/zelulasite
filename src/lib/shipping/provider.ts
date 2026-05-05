import { createDhlShipment } from "@/lib/shipping/dhl";
import type { CreateShipmentResult, OrderShippingSource, ShippingCarrierId } from "@/lib/shipping/types";

/** Şu an tek taşıyıcı: DHL; ileride env ile seçilebilir. */
export function getConfiguredShippingCarrier(): ShippingCarrierId {
  return "dhl";
}

export async function createShipmentForOrder(order: OrderShippingSource): Promise<CreateShipmentResult> {
  const carrier = getConfiguredShippingCarrier();
  if (carrier === "dhl") {
    return createDhlShipment(order);
  }
  return { ok: false, code: "UNKNOWN_CARRIER", error: "Desteklenmeyen kargo sağlayıcısı." };
}
