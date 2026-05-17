import type { SupabaseClient } from "@supabase/supabase-js";
import { generateGiftCardCode, giftCardCodeLast4, hashGiftCardCode } from "@/lib/gift-cards/code";
import { getDefaultGiftCardExpiresAt } from "@/lib/gift-cards/expiry";
import { notifyGiftCardRecipientWithResult } from "@/lib/notifications/gift-card-delivery";
import { logPayment } from "@/lib/payments/logger";

export type GiftCardOrderItemMeta = {
  denominationId: string;
  recipientEmail: string;
  recipientName?: string | null;
  personalMessage?: string | null;
};

type GiftCardLineRow = {
  id: string;
  quantity: number;
  unit_price: number | string;
  gift_card_meta: GiftCardOrderItemMeta | null;
  product: { id: string; product_kind: string | null; price: number | string } | null;
};

function parseGiftCardMeta(raw: unknown): GiftCardOrderItemMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const denominationId = String(o.denominationId ?? o.denomination_id ?? "").trim();
  const recipientEmail = String(o.recipientEmail ?? o.recipient_email ?? "")
    .trim()
    .toLowerCase();
  if (!denominationId || !recipientEmail) return null;
  return {
    denominationId,
    recipientEmail,
    recipientName: o.recipientName != null ? String(o.recipientName).trim() || null : null,
    personalMessage:
      o.personalMessage != null ? String(o.personalMessage).trim() || null : null,
  };
}

function unwrapProduct(
  raw: GiftCardLineRow["product"],
): { id: string; product_kind: string | null; price: number } | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.id) return null;
  return {
    id: String(row.id),
    product_kind: row.product_kind ?? null,
    price: Number(row.price ?? 0),
  };
}

async function insertGiftCardWithRetry(
  admin: SupabaseClient,
  buildRow: (code: string) => Record<string, unknown>,
  maxAttempts = 6,
): Promise<{ id: string; code: string } | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateGiftCardCode();
    const row = buildRow(code);
    const { data, error } = await admin.from("gift_cards").insert(row).select("id").single();
    if (!error && data?.id) {
      return { id: String(data.id), code };
    }
    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || error?.code === "23505") {
      continue;
    }
    logPayment("error", "gift_card insert failed", { error: error?.message, attempt });
    return null;
  }
  return null;
}

/**
 * Ödeme onaylandıktan sonra hediye kartı satırları için kart üretir.
 * Idempotent: aynı order_item için zaten kart varsa atlanır.
 */
export async function issueGiftCardsForPaidOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ issued: number; skipped: number; errors: string[] }> {
  const result = { issued: 0, skipped: 0, errors: [] as string[] };

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,email,user_id,currency,customer_name")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    result.errors.push(orderError?.message ?? "order not found");
    return result;
  }

  const { data: lines, error: linesError } = await admin
    .from("order_items")
    .select(
      "id,quantity,unit_price,gift_card_meta,product:product_id ( id, product_kind, price )",
    )
    .eq("order_id", orderId);

  if (linesError) {
    result.errors.push(linesError.message);
    return result;
  }

  const giftLines = ((lines ?? []) as unknown as GiftCardLineRow[]).filter((line) => {
    const product = unwrapProduct(line.product);
    const meta = parseGiftCardMeta(line.gift_card_meta);
    return product?.product_kind === "gift_card" || Boolean(meta);
  });

  if (giftLines.length === 0) {
    return result;
  }

  for (const line of giftLines) {
    const qty = Math.max(1, Math.floor(Number(line.quantity ?? 1)));
    const product = unwrapProduct(line.product as GiftCardLineRow["product"]);
    const parsedMeta = parseGiftCardMeta(line.gift_card_meta);
    const recipientEmail =
      parsedMeta?.recipientEmail || String(order.email ?? "").trim().toLowerCase();

    if (!recipientEmail) {
      result.errors.push(`order_item ${line.id}: recipient email missing`);
      continue;
    }

    const meta: GiftCardOrderItemMeta = {
      denominationId: parsedMeta?.denominationId ?? "",
      recipientEmail,
      recipientName: parsedMeta?.recipientName ?? null,
      personalMessage: parsedMeta?.personalMessage ?? null,
    };

    const { count: existingCount } = await admin
      .from("gift_cards")
      .select("id", { count: "exact", head: true })
      .eq("purchase_order_item_id", line.id);

    const alreadyIssued = existingCount ?? 0;
    if (alreadyIssued >= qty) {
      result.skipped += qty;
      continue;
    }

    let denom: { id: string; amount: number | string; currency: string } | null = null;
    let denomError: { message: string } | null = null;

    if (meta.denominationId) {
      const res = await admin
        .from("gift_card_denominations")
        .select("id, amount, currency")
        .eq("id", meta.denominationId)
        .maybeSingle();
      denom = res.data;
      denomError = res.error;
    } else if (product?.id) {
      const res = await admin
        .from("gift_card_denominations")
        .select("id, amount, currency")
        .eq("product_id", product.id)
        .maybeSingle();
      denom = res.data;
      denomError = res.error;
    }

    if (denomError || !denom) {
      result.errors.push(`order_item ${line.id}: denomination not found`);
      continue;
    }

    const faceAmount = Number(denom.amount);
    if (!Number.isFinite(faceAmount) || faceAmount <= 0) {
      result.errors.push(`order_item ${line.id}: invalid denomination amount`);
      continue;
    }

    const currency = String(denom.currency ?? order.currency ?? "TRY");

    const expiresAt = getDefaultGiftCardExpiresAt();
    const expiresAtIso = expiresAt.toISOString();
    const senderName = String(order.customer_name ?? "").trim() || "Zelula müşterisi";

    const toIssue = qty - alreadyIssued;
    for (let i = 0; i < toIssue; i++) {
      const inserted = await insertGiftCardWithRetry(admin, (code) => ({
        denomination_id: denom.id,
        code_hash: hashGiftCardCode(code),
        code_last4: giftCardCodeLast4(code),
        initial_balance: faceAmount,
        balance_remaining: faceAmount,
        currency,
        status: "active",
        purchase_order_id: orderId,
        purchase_order_item_id: line.id,
        purchased_by_user_id: order.user_id ?? null,
        purchaser_email: order.email ?? null,
        recipient_email: meta.recipientEmail,
        recipient_name: meta.recipientName ?? null,
        personal_message: meta.personalMessage ?? null,
        expires_at: expiresAtIso,
      }));

      if (!inserted) {
        result.errors.push(`order_item ${line.id}: could not insert gift card`);
        continue;
      }

      const { error: ledgerError } = await admin.from("gift_card_ledger").insert({
        gift_card_id: inserted.id,
        order_id: orderId,
        amount: faceAmount,
        entry_type: "issue",
        balance_after: faceAmount,
        note: `Issued on payment for order ${orderId}`,
      });

      if (ledgerError) {
        result.errors.push(`gift_card ${inserted.id}: ledger insert failed — ${ledgerError.message}`);
        continue;
      }

      const delivery = await notifyGiftCardRecipientWithResult({
        recipientEmail: meta.recipientEmail,
        recipientName: meta.recipientName,
        code: inserted.code,
        amountTry: faceAmount,
        currency,
        senderName,
        personalMessage: meta.personalMessage,
        expiresAt,
      });

      if (delivery.ok) {
        await admin
          .from("gift_cards")
          .update({
            delivered_at: new Date().toISOString(),
            delivery_attempts: 1,
          })
          .eq("id", inserted.id);
      } else {
        await admin
          .from("gift_cards")
          .update({ delivery_attempts: 1 })
          .eq("id", inserted.id);
        if (delivery.error) {
          result.errors.push(`gift_card ${inserted.id}: email not sent — ${delivery.error}`);
        }
      }

      result.issued++;
      logPayment("info", "Gift card issued for paid order.", {
        orderId,
        orderItemId: line.id,
        giftCardId: inserted.id,
        codeLast4: giftCardCodeLast4(inserted.code),
        emailSent: delivery.ok,
      });
    }
  }

  return result;
}
