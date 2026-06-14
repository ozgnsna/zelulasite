import { orderOperationLabelTr, type OrderDeliveryContext } from "@/lib/orders/delivery-method";

/** Ödeme satırı (sipariş kartında ayrı gösterim). */
export function paymentStatusLabelTr(status: string): string {
  switch (status) {
    case "paid":
      return "Ödendi";
    case "pending":
      return "Ödeme bekleniyor";
    case "failed":
      return "Ödeme başarısız";
    case "refunded":
      return "İade edildi";
    default:
      return status ? status : "—";
  }
}

/** Sipariş operasyon aşaması (admin rozet / liste). */
export function orderStatusLabelTr(
  status: string,
  paymentStatus?: string,
  shipping?: Pick<
    OrderDeliveryContext,
    "shipping_tracking_number" | "shipping_status" | "shipping_provider"
  >,
): string {
  if (paymentStatus !== undefined) {
    return orderOperationLabelTr(
      {
        order_status: status,
        payment_status: paymentStatus,
        ...shipping,
      },
      "admin",
    );
  }
  switch (status) {
    case "hand_delivered":
      return "Elden teslim edildi";
    case "shipped":
      return "Taşımada";
    case "processing":
      return "Hazırlanıyor";
    case "confirmed":
    case "pending":
      return "Yeni sipariş";
    case "cancelled":
      return "İptal";
    default:
      return status ? status : "—";
  }
}

/** Display labels for storefront account (Turkish). */
export function orderStatusLabel(row: {
  payment_status: string;
  order_status: string;
  shipping_tracking_number?: string | null;
  shipping_status?: string | null;
  shipping_provider?: string | null;
}): string {
  return orderOperationLabelTr(row, "customer");
}
