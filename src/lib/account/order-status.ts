import {
  fulfillmentStageCustomerLabel,
  fulfillmentStageLabelTr,
  resolveOrderFulfillmentStage,
} from "@/lib/orders/fulfillment-stage";

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
export function orderStatusLabelTr(status: string, paymentStatus?: string): string {
  if (paymentStatus !== undefined) {
    return fulfillmentStageLabelTr(resolveOrderFulfillmentStage(paymentStatus, status));
  }
  switch (status) {
    case "hand_delivered":
      return "Teslim edildi";
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
}): string {
  const stage = resolveOrderFulfillmentStage(row.payment_status, row.order_status);
  return fulfillmentStageCustomerLabel(stage);
}
