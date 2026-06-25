import { createDhlShipment } from "@/lib/shipping/dhl";
import { createNavlungoShipment } from "@/lib/shipping/navlungo";
import type { CreateShipmentResult, OrderShippingSource, ShippingCarrierId } from "@/lib/shipping/types";

const CARRIER_LABELS: Record<ShippingCarrierId, string> = {
  dhl: "DHL",
  navlungo: "Navlungo",
};

export function parseShippingCarrierId(raw: unknown): ShippingCarrierId | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "dhl" || v === "navlungo") return v;
  return null;
}

export function getShippingCarrierLabel(carrier?: ShippingCarrierId | null): string {
  if (carrier) return CARRIER_LABELS[carrier];
  return CARRIER_LABELS[getConfiguredShippingCarrier()];
}

/** Varsayılan otomatik kargo — env; admin panelde her iki taşıyıcı da ayrı seçilebilir. */
export function getConfiguredShippingCarrier(): ShippingCarrierId {
  const explicit = process.env.SHIPPING_CARRIER?.trim().toLowerCase();
  if (explicit === "dhl" || explicit === "navlungo") return explicit;
  if (process.env.NAVLUNGO_API_USERNAME?.trim() && process.env.NAVLUNGO_API_PASSWORD?.trim()) {
    return "navlungo";
  }
  return "dhl";
}

export function isNavlungoConfigured(): boolean {
  const mock = String(process.env.NAVLUNGO_USE_MOCK ?? "false").trim().toLowerCase();
  if (mock === "1" || mock === "true" || mock === "yes") return true;
  const username = process.env.NAVLUNGO_API_USERNAME?.trim();
  const password = process.env.NAVLUNGO_API_PASSWORD?.trim();
  const senderId = Number.parseInt(String(process.env.NAVLUNGO_SENDER_ADDRESS_ID ?? "").trim(), 10);
  return Boolean(username && password && Number.isFinite(senderId) && senderId > 0);
}

export function isDhlAutoCreateAvailable(): boolean {
  const mock = String(process.env.DHL_USE_MOCK ?? "true").trim().toLowerCase();
  if (mock === "1" || mock === "true" || mock === "yes") return true;
  return Boolean(
    process.env.DHL_API_BASE_URL?.trim() &&
      process.env.DHL_API_KEY?.trim() &&
      process.env.DHL_ACCOUNT_NUMBER?.trim(),
  );
}

export async function createShipmentForOrder(
  order: OrderShippingSource,
  carrier: ShippingCarrierId,
): Promise<CreateShipmentResult> {
  if (carrier === "navlungo") {
    return createNavlungoShipment(order);
  }
  return createDhlShipment(order);
}
