import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentCallbackPayload } from "@/lib/payments/types";
import { logPayment } from "@/lib/payments/logger";

export async function applyPaymentResult(payload: PaymentCallbackPayload) {
  const admin = createAdminClient();

  const { data: existingLog } = await admin
    .from("payment_logs")
    .select("id")
    .eq("callback_hash", payload.callbackHash)
    .maybeSingle();
  if (existingLog) {
    logPayment("info", "Duplicate callback ignored by callback_hash.", {
      orderId: payload.orderId,
      callbackHash: payload.callbackHash,
    });
    return { ok: true, duplicate: true as const };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id,payment_status,order_status,payment_reference")
    .eq("id", payload.orderId)
    .maybeSingle();

  if (!order) {
    logPayment("warn", "Callback received for missing order.", { orderId: payload.orderId });
    await admin.from("payment_logs").insert({
      order_id: null,
      provider: payload.provider,
      event_type: "callback",
      status: "orphaned",
      callback_payload: payload.raw,
      callback_hash: payload.callbackHash,
      reference: payload.reference ?? null,
      verification_status: "passed",
      verification_error: null,
      processed_at: new Date().toISOString(),
    });
    return { ok: false, reason: "order_not_found" as const };
  }

  if (order.payment_status === "paid" && payload.status === "success") {
    logPayment("info", "Already paid order received duplicate success callback.", {
      orderId: payload.orderId,
      callbackHash: payload.callbackHash,
    });
    await admin.from("payment_logs").insert({
      order_id: payload.orderId,
      provider: payload.provider,
      event_type: "callback",
      status: "duplicate_success",
      callback_payload: payload.raw,
      callback_hash: payload.callbackHash,
      reference: payload.reference ?? order.payment_reference ?? null,
      verification_status: "passed",
      verification_error: null,
      processed_at: new Date().toISOString(),
    });
    return { ok: true, duplicate: true as const };
  }

  await admin.from("payment_logs").insert({
    order_id: payload.orderId,
    provider: payload.provider,
    event_type: "callback",
    status: payload.status,
    callback_payload: payload.raw,
    callback_hash: payload.callbackHash,
    reference: payload.reference ?? order.payment_reference ?? null,
    verification_status: "passed",
    verification_error: null,
    processed_at: new Date().toISOString(),
  });

  await admin
    .from("orders")
    .update({
      payment_status: payload.status === "success" ? "paid" : "failed",
      order_status: payload.status === "success" ? "confirmed" : "pending",
      payment_reference: payload.reference ?? order.payment_reference ?? null,
    })
    .eq("id", payload.orderId);

  return { ok: true };
}
