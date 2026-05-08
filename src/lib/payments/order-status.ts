import { createAdminClient } from "@/lib/supabase/admin";
import { syncLoyaltyLedgersForOrder } from "@/lib/loyalty/sync-order-ledger";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";
import type { PaymentCallbackPayload } from "@/lib/payments/types";
import { logPayment } from "@/lib/payments/logger";
import { notifyAdminOrderEventWithResult } from "@/lib/notifications/order-admin";

async function applyLocalOrderStockDelta(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data: rows } = await admin
    .from("order_items")
    .select("product_id,quantity")
    .eq("order_id", orderId);
  if (!rows || rows.length === 0) return;

  const qtyByProduct = new Map<string, number>();
  for (const row of rows) {
    const productId = String(row.product_id ?? "").trim();
    if (!productId) continue;
    const qty = Number(row.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    qtyByProduct.set(productId, (qtyByProduct.get(productId) ?? 0) + qty);
  }
  const productIds = [...qtyByProduct.keys()];
  if (productIds.length === 0) return;

  const { data: products } = await admin
    .from("products")
    .select("id,stock_quantity")
    .in("id", productIds);

  const updates = (products ?? []).map((p) => {
    const id = String(p.id ?? "");
    const current = Number(p.stock_quantity ?? 0);
    const delta = qtyByProduct.get(id) ?? 0;
    const next = Math.max(0, current - delta);
    return {
      id,
      stock_quantity: next,
      is_active: next > 0,
    };
  });

  for (const u of updates) {
    await admin.from("products").update({ stock_quantity: u.stock_quantity, is_active: u.is_active }).eq("id", u.id);
  }

  await syncPriceInventoryForProducts(admin, updates.map((u) => u.id), "payment_paid_stock_delta");
}

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

  if (payload.status === "success") {
    await applyLocalOrderStockDelta(admin, payload.orderId);

    const { data: orderForNotify } = await admin
      .from("orders")
      .select("id,order_number,customer_name,email,phone,total,currency,payment_status,payment_provider")
      .eq("id", payload.orderId)
      .maybeSingle();
    const { data: itemsForNotify } = await admin
      .from("order_items")
      .select("quantity,total_price,product:products(name)")
      .eq("order_id", payload.orderId)
      .limit(20);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    if (orderForNotify) {
      const notifyResult = await notifyAdminOrderEventWithResult({
        event: "order_paid",
        orderId: orderForNotify.id,
        orderNumber: orderForNotify.order_number,
        customerName: String(orderForNotify.customer_name ?? ""),
        customerEmail: String(orderForNotify.email ?? ""),
        customerPhone: String(orderForNotify.phone ?? ""),
        total: Number(orderForNotify.total ?? 0),
        currency: String(orderForNotify.currency ?? "TRY"),
        paymentStatus: String(orderForNotify.payment_status ?? "paid"),
        paymentProvider: String(orderForNotify.payment_provider ?? payload.provider),
        items: (itemsForNotify ?? []).map((i) => ({
          name: String(i.product?.[0]?.name ?? "Urun"),
          quantity: Number(i.quantity ?? 0),
          totalPrice: Number(i.total_price ?? 0),
        })),
        adminOrderUrl: `${siteUrl}/admin/orders/${payload.orderId}`,
      });
      await admin.from("payment_logs").insert({
        order_id: payload.orderId,
        provider: "internal_notify",
        event_type: "admin_notify",
        status: notifyResult.email.ok || notifyResult.whatsapp.ok ? "sent_partial_or_full" : "failed",
        response_payload: notifyResult,
        callback_payload: null,
        callback_hash: null,
        reference: orderForNotify.order_number,
        verification_status:
          notifyResult.email.ok || notifyResult.whatsapp.ok ? "passed" : "failed",
        verification_error:
          notifyResult.email.error || notifyResult.whatsapp.error || null,
        processed_at: new Date().toISOString(),
      });
    }
  }

  await syncLoyaltyLedgersForOrder(admin, payload.orderId);

  return { ok: true };
}
