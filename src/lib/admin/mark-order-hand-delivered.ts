import type { SupabaseClient } from "@supabase/supabase-js";
import { syncLoyaltyLedgersForOrder } from "@/lib/loyalty/sync-order-ledger";
import { notifyCustomerOrderWhatsApp } from "@/lib/notifications/order-customer-whatsapp";

export type MarkOrderHandDeliveredResult =
  | { ok: true; alreadyDelivered?: boolean }
  | { ok: false; error: string };

/** Siparişi elden veya kargo sonrası teslim edildi olarak işaretle. */
export async function markOrderHandDeliveredInDb(
  admin: SupabaseClient,
  orderId: string,
): Promise<MarkOrderHandDeliveredResult> {
  if (!orderId) return { ok: false, error: "Sipariş kimliği gerekli." };

  // Prod DB’de kargo kolonları migration’sız olabilir — yalnızca temel alanlar.
  const { data: before, error: fetchErr } = await admin
    .from("orders")
    .select("payment_status,order_status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!before) return { ok: false, error: "Sipariş bulunamadı." };

  if (String(before.order_status ?? "") === "hand_delivered") {
    return { ok: true, alreadyDelivered: true };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("orders")
    .update({
      order_status: "hand_delivered",
      payment_status: before.payment_status,
      updated_at: now,
    })
    .eq("id", orderId);

  if (updateErr) return { ok: false, error: updateErr.message };

  await syncLoyaltyLedgersForOrder(admin, orderId);

  await admin.from("payment_logs").insert({
    order_id: orderId,
    provider: "manual",
    event_type: "manual_hand_delivery",
    status: "updated",
    request_payload: { order_status: "hand_delivered" },
    verification_status: "passed",
    processed_at: now,
  });

  await notifyCustomerOrderWhatsApp(admin, orderId, "order_delivered");

  return { ok: true };
}
