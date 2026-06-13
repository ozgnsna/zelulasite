/**
 * Operasyonel sipariş aşamaları (DB order_status değerleri aynı kalır).
 *
 * new        → pending | confirmed (ödendi, henüz hazırlık başlamadı)
 * preparing  → processing
 * in_transit → shipped
 * delivered  → hand_delivered
 */
export type OrderFulfillmentStage =
  | "payment_pending"
  | "payment_failed"
  | "cancelled"
  | "new"
  | "preparing"
  | "in_transit"
  | "delivered";

export function resolveOrderFulfillmentStage(
  paymentStatus: string | null | undefined,
  orderStatus: string | null | undefined,
): OrderFulfillmentStage {
  const pay = String(paymentStatus ?? "").trim();
  const os = String(orderStatus ?? "").trim();

  if (os === "cancelled") return "cancelled";
  if (pay === "failed") return "payment_failed";
  if (pay !== "paid") return "payment_pending";
  if (os === "hand_delivered") return "delivered";
  if (os === "shipped") return "in_transit";
  if (os === "processing") return "preparing";
  return "new";
}

export function fulfillmentStageLabelTr(stage: OrderFulfillmentStage): string {
  switch (stage) {
    case "payment_pending":
      return "Ödeme bekleniyor";
    case "payment_failed":
      return "Ödeme başarısız";
    case "cancelled":
      return "İptal";
    case "new":
      return "Yeni sipariş";
    case "preparing":
      return "Hazırlanıyor";
    case "in_transit":
      return "Taşımada";
    case "delivered":
      return "Teslim edildi";
  }
}

/** Müşteri hesabı / teşekkür sayfası. */
export function fulfillmentStageCustomerLabel(stage: OrderFulfillmentStage): string {
  switch (stage) {
    case "payment_pending":
      return "Ödeme bekleniyor";
    case "payment_failed":
      return "Ödeme başarısız";
    case "cancelled":
      return "İptal edildi";
    case "new":
      return "Siparişiniz alındı";
    case "preparing":
      return "Hazırlanıyor";
    case "in_transit":
      return "Kargoda";
    case "delivered":
      return "Teslim edildi";
  }
}

export function fulfillmentStageBadgeClasses(stage: OrderFulfillmentStage): string {
  switch (stage) {
    case "delivered":
      return "bg-emerald-50 text-emerald-950 ring-emerald-600/25";
    case "in_transit":
      return "bg-sky-50 text-sky-950 ring-sky-600/20";
    case "preparing":
      return "bg-violet-50 text-violet-950 ring-violet-600/20";
    case "new":
      return "bg-amber-50 text-amber-950 ring-amber-500/30";
    case "cancelled":
    case "payment_failed":
      return "bg-rose-50 text-rose-950 ring-rose-600/30";
    case "payment_pending":
      return "bg-amber-50 text-amber-950 ring-amber-500/30";
  }
}

export function fulfillmentStageListChipClasses(stage: OrderFulfillmentStage): string {
  switch (stage) {
    case "delivered":
      return "border-emerald-200/70 bg-emerald-50/55 text-emerald-900/85 ring-emerald-400/10";
    case "in_transit":
      return "border-sky-300/55 bg-sky-50/80 text-sky-950/90 ring-sky-400/12";
    case "preparing":
      return "border-violet-300/45 bg-violet-50/70 text-violet-900 ring-violet-500/12";
    case "new":
      return "border-amber-400/45 bg-amber-50/90 text-amber-950 ring-amber-500/14";
    case "cancelled":
      return "border-rose-200/55 bg-rose-50/65 text-rose-800/80 ring-rose-300/12";
    case "payment_failed":
      return "border-rose-300/70 bg-rose-50/80 text-rose-900/90 ring-rose-500/15";
    case "payment_pending":
      return "border-amber-300/55 bg-amber-50/90 text-amber-950/90 ring-amber-400/14";
  }
}

/** Eski filtre URL’leri → yeni filtre kimlikleri. */
export function normalizeOrdersListFilter(raw: string): string {
  const id = String(raw ?? "").trim();
  if (id === "ship_ready") return "new";
  if (id === "processing") return "preparing";
  if (id === "done") return "delivered";
  return id;
}

export const ORDER_LIST_FILTER_IDS = new Set([
  "all",
  "today",
  "new",
  "preparing",
  "in_transit",
  "delivered",
  "payment_pending",
  // geriye dönük
  "ship_ready",
  "processing",
  "done",
]);
