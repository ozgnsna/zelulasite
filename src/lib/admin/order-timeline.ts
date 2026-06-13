import {
  fulfillmentStageLabelTr,
  resolveOrderFulfillmentStage,
  type OrderFulfillmentStage,
} from "@/lib/orders/fulfillment-stage";

export type AdminOrderTimelineStep = {
  key: string;
  label: string;
  detail: string;
  state: "complete" | "active" | "pending";
};

const FULFILLMENT_STEPS: { key: OrderFulfillmentStage; label: string }[] = [
  { key: "new", label: "Yeni sipariş" },
  { key: "preparing", label: "Hazırlanıyor" },
  { key: "in_transit", label: "Taşımada" },
  { key: "delivered", label: "Teslim edildi" },
];

const STAGE_ORDER: OrderFulfillmentStage[] = ["new", "preparing", "in_transit", "delivered"];

function stageIndex(stage: OrderFulfillmentStage): number {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 ? i : 0;
}

function stepState(current: OrderFulfillmentStage, step: OrderFulfillmentStage): AdminOrderTimelineStep["state"] {
  const cur = stageIndex(current);
  const idx = stageIndex(step);
  if (cur > idx) return "complete";
  if (cur === idx) return "active";
  return "pending";
}

function stepDetail(stage: OrderFulfillmentStage, step: OrderFulfillmentStage): string {
  if (stage === "cancelled") {
    if (step === "new") return "Sipariş oluşturuldu";
    return "Sipariş iptal edildi";
  }
  switch (step) {
    case "new":
      return stage === "new" ? "Ödeme alındı, sıraya alındı" : "Tamamlandı";
    case "preparing":
      if (stage === "preparing") return "Paketleniyor";
      return stageIndex(stage) > stageIndex("preparing") ? "Hazırlık bitti" : "Sırada";
    case "in_transit":
      if (stage === "in_transit") return "Kargo yolda";
      return stage === "delivered" ? "Teslimat tamamlandı" : "Kargo bekleniyor";
    case "delivered":
      return stage === "delivered" ? "Müşteriye ulaştı" : "Teslimat bekleniyor";
    default:
      return fulfillmentStageLabelTr(step);
  }
}

/** Ödeme sonrası: Yeni sipariş → Hazırlanıyor → Taşımada → Teslim edildi. */
export function buildAdminOrderTimeline(order: {
  created_at: string;
  payment_status: string;
  order_status: string;
}): AdminOrderTimelineStep[] {
  const stage = resolveOrderFulfillmentStage(order.payment_status, order.order_status);
  const createdDetail = new Date(order.created_at).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (stage === "payment_pending" || stage === "payment_failed") {
    return [
      {
        key: "created",
        label: "Oluşturuldu",
        detail: createdDetail,
        state: "complete",
      },
      {
        key: "payment",
        label: "Ödeme",
        detail: stage === "payment_failed" ? "Ödeme başarısız" : "Ödeme bekleniyor",
        state: "active",
      },
      ...FULFILLMENT_STEPS.map((s) => ({
        key: s.key,
        label: s.label,
        detail: "Ödeme sonrası başlayacak",
        state: "pending" as const,
      })),
    ];
  }

  if (stage === "cancelled") {
    return FULFILLMENT_STEPS.map((s, i) => ({
      key: s.key,
      label: s.label,
      detail: stepDetail(stage, s.key),
      state: (i === 0 ? "complete" : "pending") as AdminOrderTimelineStep["state"],
    }));
  }

  return FULFILLMENT_STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    detail: stepDetail(stage, s.key),
    state: stepState(stage, s.key),
  }));
}
