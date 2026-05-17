import { createAdminClient } from "@/lib/supabase/admin";
import { syncLoyaltyLedgersForOrder } from "@/lib/loyalty/sync-order-ledger";
import { syncPriceInventoryForProducts } from "@/lib/marketplaces/trendyol/inventory";
import type { PaymentCallbackPayload } from "@/lib/payments/types";
import { logPayment } from "@/lib/payments/logger";
import { notifyAdminOrderEventWithResult } from "@/lib/notifications/order-admin";
import { issueGiftCardsForPaidOrder } from "@/lib/gift-cards/fulfillment";
import {
  captureGiftCardRedemptionForOrder,
  releaseGiftCardHoldsForOrder,
} from "@/lib/gift-cards/redeem";

type LockedOrderRow = {
  id: string;
  payment_status: string;
  order_status: string;
  payment_reference: string | null;
};

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
    .select("id,stock_quantity,product_kind")
    .in("id", productIds);

  const updates = (products ?? [])
    .filter((p) => p.product_kind !== "gift_card")
    .map((p) => {
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

async function insertPaymentCallbackLog(
  admin: ReturnType<typeof createAdminClient>,
  row: {
    order_id: string | null;
    provider: string;
    status: string;
    callback_payload: Record<string, string>;
    callback_hash: string;
    reference?: string | null;
  },
): Promise<boolean> {
  const { error } = await admin.from("payment_logs").insert({
    order_id: row.order_id,
    provider: row.provider,
    event_type: "callback",
    status: row.status,
    callback_payload: row.callback_payload,
    callback_hash: row.callback_hash,
    reference: row.reference ?? null,
    verification_status: "passed",
    verification_error: null,
    processed_at: new Date().toISOString(),
  });
  if (error?.code === "23505") return false;
  if (error) {
    logPayment("warn", "payment_logs callback insert failed.", {
      orderId: row.order_id,
      error: error.message,
    });
    return false;
  }
  return true;
}

async function lockOrderForPaymentCallback(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<{ order: LockedOrderRow | null; lockFailed: boolean }> {
  const { data: lockedRows, error: lockError } = await admin.rpc("lock_order_for_payment_callback", {
    p_order_id: orderId,
  });

  if (lockError) {
    logPayment("error", "lock_order_for_payment_callback failed.", {
      orderId,
      error: lockError.message,
    });
    return { order: null, lockFailed: true };
  }

  const order = ((lockedRows as LockedOrderRow[] | null) ?? [])[0] ?? null;
  return { order, lockFailed: false };
}

export async function applyPaymentResult(payload: PaymentCallbackPayload) {
  const admin = createAdminClient();

  const { order, lockFailed } = await lockOrderForPaymentCallback(admin, payload.orderId);
  if (lockFailed) {
    return { ok: false, reason: "lock_failed" as const };
  }

  const runGiftCardRepair = async () => {
    if (payload.status === "success") {
      await captureGiftCardRedemptionForOrder(admin, payload.orderId);
    } else {
      await releaseGiftCardHoldsForOrder(admin, payload.orderId);
    }
  };

  if (!order) {
    logPayment("warn", "Callback received for missing order.", { orderId: payload.orderId });
    await insertPaymentCallbackLog(admin, {
      order_id: null,
      provider: payload.provider,
      status: "orphaned",
      callback_payload: payload.raw,
      callback_hash: payload.callbackHash,
      reference: payload.reference ?? null,
    });
    return { ok: false, reason: "order_not_found" as const };
  }

  /** Birincil koruma: ödeme zaten alındıysa stok / bildirim / yeni kart üretimi yok. */
  if (order.payment_status === "paid") {
    logPayment("info", "Order already paid; skipping payment side effects (repair only).", {
      orderId: payload.orderId,
      callbackHash: payload.callbackHash,
      callbackStatus: payload.status,
    });
    await insertPaymentCallbackLog(admin, {
      order_id: payload.orderId,
      provider: payload.provider,
      status: "duplicate_paid_order",
      callback_payload: payload.raw,
      callback_hash: payload.callbackHash,
      reference: payload.reference ?? order.payment_reference,
    });
    await runGiftCardRepair();
    return { ok: true, duplicate: true as const };
  }

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
    await runGiftCardRepair();
    return { ok: true, duplicate: true as const };
  }

  await insertPaymentCallbackLog(admin, {
    order_id: payload.orderId,
    provider: payload.provider,
    status: payload.status,
    callback_payload: payload.raw,
    callback_hash: payload.callbackHash,
    reference: payload.reference ?? order.payment_reference,
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
    await captureGiftCardRedemptionForOrder(admin, payload.orderId);

    const giftIssue = await issueGiftCardsForPaidOrder(admin, payload.orderId);
    if (giftIssue.issued > 0 || giftIssue.errors.length > 0) {
      await admin.from("payment_logs").insert({
        order_id: payload.orderId,
        provider: "internal_gift_card",
        event_type: "gift_card_issue",
        status: giftIssue.errors.length > 0 ? "partial" : "issued",
        response_payload: giftIssue,
        callback_payload: null,
        callback_hash: null,
        reference: null,
        verification_status: giftIssue.errors.length > 0 ? "failed" : "passed",
        verification_error: giftIssue.errors.length > 0 ? giftIssue.errors.join("; ") : null,
        processed_at: new Date().toISOString(),
      });
    }

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
  } else {
    await releaseGiftCardHoldsForOrder(admin, payload.orderId);
  }

  await syncLoyaltyLedgersForOrder(admin, payload.orderId);

  return { ok: true };
}
