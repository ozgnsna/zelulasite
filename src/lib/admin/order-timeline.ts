export type AdminOrderTimelineStep = {
  key: string;
  label: string;
  detail: string;
  state: "complete" | "active" | "pending";
};

/** Oluşturuldu → Ödeme → Hazırlık: teknik terim yok, günlük iş dili. */
export function buildAdminOrderTimeline(order: {
  created_at: string;
  payment_status: string;
  order_status: string;
}): AdminOrderTimelineStep[] {
  const paid = order.payment_status === "paid";
  const cancelled = String(order.order_status ?? "") === "cancelled";
  const os = String(order.order_status ?? "");

  const createdDetail = new Date(order.created_at).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let paymentDetail: string;
  let paymentState: AdminOrderTimelineStep["state"];
  if (cancelled && !paid) {
    paymentDetail = "İptal — ödeme alınmadı";
    paymentState = "complete";
  } else if (cancelled && paid) {
    paymentDetail = "Ödeme alındı, sipariş iptal";
    paymentState = "complete";
  } else if (paid) {
    paymentDetail = "Ödeme tamamlandı";
    paymentState = "complete";
  } else {
    paymentDetail = "Ödeme bekleniyor";
    paymentState = "active";
  }

  let processingDetail: string;
  let processingState: AdminOrderTimelineStep["state"];
  if (cancelled) {
    processingDetail = "Bu sipariş iptal edildi";
    processingState = "complete";
  } else if (os === "hand_delivered") {
    processingDetail = "Elden teslim edildi";
    processingState = "complete";
  } else if (os === "shipped") {
    processingDetail = "Kargoya verildi";
    processingState = "complete";
  } else if (os === "processing") {
    processingDetail = "Hazırlanıyor (paketleme)";
    processingState = "complete";
  } else if (os === "confirmed") {
    processingDetail = paid ? "Onaylandı, hazırlık sırada" : "Onay bekliyor";
    processingState = paid ? "complete" : "active";
  } else if (paid && os === "pending") {
    processingDetail = "Ödeme tamam — depo / onay sırası";
    processingState = "active";
  } else if (!paid) {
    processingDetail = "Ödeme sonrası başlayacak";
    processingState = "pending";
  } else {
    processingDetail = "İşleniyor";
    processingState = "active";
  }

  return [
    { key: "created", label: "Oluşturuldu", detail: createdDetail, state: "complete" },
    { key: "payment", label: "Ödeme", detail: paymentDetail, state: paymentState },
    { key: "processing", label: "Hazırlık", detail: processingDetail, state: processingState },
  ];
}
