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

/** Sipariş durumu satırı (ayrı gösterim). */
export function orderStatusLabelTr(status: string): string {
  switch (status) {
    case "hand_delivered":
      return "Elden Teslim";
    case "shipped":
      return "Kargoda";
    case "processing":
      return "Hazırlanıyor";
    case "confirmed":
      return "Onaylandı";
    case "pending":
      return "Beklemede";
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
  const { payment_status, order_status } = row;

  if (payment_status === "failed") {
    return "Ödeme başarısız";
  }
  if (payment_status === "pending") {
    return "Ödeme bekleniyor";
  }
  if (payment_status === "paid") {
    if (order_status === "hand_delivered") return "Elden Teslim";
    if (order_status === "shipped") return "Kargoda";
    if (order_status === "processing") return "Hazırlanıyor";
    if (order_status === "confirmed" || order_status === "pending") {
      return "Ödendi";
    }
    return "Hazırlanıyor";
  }

  return "İşlemde";
}
