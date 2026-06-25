import { randomBytes } from "node:crypto";
import type { CreateShipmentResult, OrderShippingSource } from "@/lib/shipping/types";

/** DHL Express takip sayfası (TR). */
export function buildDhlTrackingUrl(trackingNumber: string): string | null {
  const id = String(trackingNumber ?? "").trim();
  if (!id || /^DHL-MOCK-/i.test(id)) return null;
  return `https://www.dhl.com/tr-tr/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(id)}`;
}

function useMock(): boolean {
  const v = String(process.env.DHL_USE_MOCK ?? "true").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * DHL gönderi oluşturma.
 * Mock: takip no + sahte etiket URL; `shipping_status` = "created".
 * Real: DHL dokümantasyonu gelince env + endpoint eşlemesi burada tamamlanacak.
 */
export async function createDhlShipment(order: OrderShippingSource): Promise<CreateShipmentResult> {
  if (useMock()) {
    const suffix = randomBytes(5).toString("hex").toUpperCase();
    const trackingNumber = `DHL-MOCK-${suffix}`;
    const labelUrl = `https://example.invalid/dhl/labels/mock/${order.id}.pdf`;
    return {
      ok: true,
      provider: "dhl",
      trackingNumber,
      labelUrl,
      shippingStatus: "created",
    };
  }

  const base = process.env.DHL_API_BASE_URL?.trim();
  const apiKey = process.env.DHL_API_KEY?.trim();
  const account = process.env.DHL_ACCOUNT_NUMBER?.trim();

  void base;
  void apiKey;
  void account;
  void order;

  // TODO(DHL): Gerçek API — örn. MyDHL / REST shipment create; request body: alıcı, adres (order.shipping_address_json), referans order.order_number
  // TODO(DHL): Yanıttan trackingNumber, label URL (veya base64 PDF) ve durum kodunu eşle
  return {
    ok: false,
    code: "DHL_NOT_CONFIGURED",
    error: "DHL canlı API henüz yapılandırılmadı. Geliştirme için DHL_USE_MOCK=true kullanın.",
  };
}
