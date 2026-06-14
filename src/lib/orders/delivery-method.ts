import {
  fulfillmentStageCustomerLabel,
  fulfillmentStageLabelTr,
  resolveOrderFulfillmentStage,
} from "@/lib/orders/fulfillment-stage";
import { orderHasShippingTracking } from "@/lib/orders/shipping-tracking";

export type OrderDeliveryKind = "hand" | "courier";

export type OrderDeliveryContext = {
  order_status: string;
  payment_status: string;
  shipping_tracking_number?: string | null;
  shipping_status?: string | null;
  shipping_provider?: string | null;
};

/** Teslim edilmiş siparişlerde elden mi kargo mu. */
export function resolveOrderDeliveryKind(order: OrderDeliveryContext): OrderDeliveryKind | null {
  if (String(order.order_status ?? "") !== "hand_delivered") return null;
  if (orderHasShippingTracking(order.shipping_tracking_number, order.shipping_status)) {
    return "courier";
  }
  return "hand";
}

export function orderDeliveredLabelTr(
  kind: OrderDeliveryKind | null,
  audience: "admin" | "customer" = "admin",
): string {
  if (kind === "hand") return "Elden teslim edildi";
  if (kind === "courier") {
    return audience === "customer" ? "Teslim edildi" : "Kargo ile teslim edildi";
  }
  return "Teslim edildi";
}

/** Admin liste / rozet / müşteri hesabı için operasyon etiketi. */
export function orderOperationLabelTr(
  order: OrderDeliveryContext,
  audience: "admin" | "customer" = "admin",
): string {
  const stage = resolveOrderFulfillmentStage(order.payment_status, order.order_status);
  if (stage === "delivered") {
    return orderDeliveredLabelTr(resolveOrderDeliveryKind(order), audience);
  }
  if (audience === "customer") {
    return fulfillmentStageCustomerLabel(stage);
  }
  return fulfillmentStageLabelTr(stage);
}
