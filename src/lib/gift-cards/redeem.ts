import type { SupabaseClient } from "@supabase/supabase-js";
import { giftCardCodeLookupHashes, normalizeGiftCardCodeInput } from "@/lib/gift-cards/code";

export const GIFT_CARD_HOLD_TTL_MINUTES = 15;

export type GiftCardApplyResult =
  | {
      ok: true;
      amountApplied: number;
      balanceRemaining: number;
      last4: string;
      giftCardId: string;
    }
  | { ok: false; error: string };

type GiftCardRow = {
  id: string;
  code_last4: string;
  balance_remaining: number | string;
  status: string;
  expires_at: string | null;
};

export function giftCardHoldExpiresAt(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMinutes(d.getMinutes() + GIFT_CARD_HOLD_TTL_MINUTES);
  return d.toISOString();
}

async function lookupGiftCardByCode(
  admin: SupabaseClient,
  rawCode: string,
): Promise<{ card: GiftCardRow | null; error?: string }> {
  const normalized = normalizeGiftCardCodeInput(rawCode);
  if (normalized.length < 8) {
    return { card: null, error: "Geçerli bir hediye kartı kodu girin." };
  }

  for (const codeHash of giftCardCodeLookupHashes(rawCode)) {
    const { data, error } = await admin
      .from("gift_cards")
      .select("id,code_last4,balance_remaining,status,expires_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (error) return { card: null, error: error.message };
    if (data) return { card: data as GiftCardRow };
  }

  // Hash uyumsuzluğu (prod pepper farkı): tek aktif kart last4 eşleşmesi
  if (normalized.length === 16) {
    const last4 = normalized.slice(-4);
    const { data: last4Cards, error: last4Error } = await admin
      .from("gift_cards")
      .select("id,code_last4,balance_remaining,status,expires_at")
      .eq("code_last4", last4)
      .eq("status", "active");

    if (!last4Error && last4Cards?.length === 1) {
      return { card: last4Cards[0] as GiftCardRow };
    }
  }

  return { card: null, error: "Hediye kartı kodu bulunamadı." };
}

function validateGiftCardActive(card: GiftCardRow): string | null {
  if (card.status !== "active") {
    return "Bu hediye kartı artık kullanılamıyor.";
  }
  const balance = Number(card.balance_remaining);
  if (!Number.isFinite(balance) || balance <= 0) {
    return "Hediye kartı bakiyesi tükenmiş.";
  }
  if (card.expires_at) {
    const exp = new Date(card.expires_at);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= Date.now()) {
      return "Hediye kartının süresi dolmuş.";
    }
  }
  return null;
}

async function sumPendingHoldsForCard(
  admin: SupabaseClient,
  giftCardId: string,
  excludeOrderId?: string,
): Promise<number> {
  let q = admin
    .from("gift_card_holds")
    .select("amount_held,order_id")
    .eq("gift_card_id", giftCardId)
    .eq("status", "pending");

  const { data, error } = await q;
  if (error || !data) return 0;

  return data.reduce((sum, row) => {
    if (excludeOrderId && row.order_id === excludeOrderId) return sum;
    return sum + Number(row.amount_held ?? 0);
  }, 0);
}

export async function computeGiftCardRedeemAmount(
  admin: SupabaseClient,
  card: GiftCardRow,
  orderTotal: number,
  excludeOrderId?: string,
): Promise<{ amountApplied: number; balanceRemaining: number; available: number }> {
  const balance = Number(card.balance_remaining);
  const pendingHeld = await sumPendingHoldsForCard(admin, card.id, excludeOrderId);
  const available = Math.max(0, balance - pendingHeld);
  const payable = Math.max(0, orderTotal);
  const amountApplied = Math.min(available, payable);
  const balanceRemaining = Math.max(0, available - amountApplied);
  return { amountApplied, balanceRemaining, available };
}

/** Sepet/checkout önizlemesi — hold oluşturmaz. */
export async function previewGiftCardRedemption(
  admin: SupabaseClient,
  rawCode: string,
  orderTotal: number,
): Promise<GiftCardApplyResult> {
  const { card, error: lookupError } = await lookupGiftCardByCode(admin, rawCode);
  if (!card) return { ok: false, error: lookupError ?? "Kod bulunamadı." };

  const validationError = validateGiftCardActive(card);
  if (validationError) return { ok: false, error: validationError };

  const { amountApplied, balanceRemaining, available } = await computeGiftCardRedeemAmount(
    admin,
    card,
    orderTotal,
  );

  if (available <= 0) {
    return { ok: false, error: "Bu kartın kullanılabilir bakiyesi kalmamış." };
  }
  if (amountApplied <= 0) {
    return { ok: false, error: "Bu sipariş tutarı için kart uygulanamıyor." };
  }

  return {
    ok: true,
    amountApplied,
    balanceRemaining,
    last4: card.code_last4,
    giftCardId: card.id,
  };
}

/** Sipariş oluşturulduktan sonra hold + order alanlarını günceller. */
export async function applyGiftCardToOrder(
  admin: SupabaseClient,
  rawCode: string,
  orderId: string,
): Promise<GiftCardApplyResult> {
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,subtotal,discount_amount,total,payment_status,gift_card_redeem_amount")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, error: "Sipariş bulunamadı." };
  }
  if (order.payment_status === "paid") {
    return { ok: false, error: "Ödenmiş siparişe hediye kartı uygulanamaz." };
  }

  const orderTotal = Number(order.total ?? 0);
  if (orderTotal <= 0) {
    return { ok: false, error: "Sipariş tutarı sıfır; hediye kartı uygulanamaz." };
  }

  await releaseGiftCardHoldsForOrder(admin, orderId, { restoreOrderTotal: false });

  const preview = await previewGiftCardRedemption(admin, rawCode, orderTotal);
  if (!preview.ok) return preview;

  const holdExpires = giftCardHoldExpiresAt();
  const { error: holdError } = await admin.from("gift_card_holds").insert({
    gift_card_id: preview.giftCardId,
    order_id: orderId,
    amount_held: preview.amountApplied,
    status: "pending",
    expires_at: holdExpires,
  });

  if (holdError) {
    return { ok: false, error: "Hediye kartı rezervasyonu yapılamadı. Lütfen tekrar deneyin." };
  }

  const newTotal = Math.max(0, orderTotal - preview.amountApplied);
  const { error: updateError } = await admin
    .from("orders")
    .update({
      gift_card_id: preview.giftCardId,
      gift_card_redeem_amount: preview.amountApplied,
      total: Number(newTotal.toFixed(2)),
    })
    .eq("id", orderId);

  if (updateError) {
    await admin
      .from("gift_card_holds")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("status", "pending");
    return { ok: false, error: "Sipariş güncellenemedi." };
  }

  return preview;
}

export async function releaseGiftCardHoldsForOrder(
  admin: SupabaseClient,
  orderId: string,
  options?: { restoreOrderTotal?: boolean },
): Promise<void> {
  const restore = options?.restoreOrderTotal !== false;

  const { data: order } = await admin
    .from("orders")
    .select("id,subtotal,discount_amount,gift_card_redeem_amount,total,payment_status")
    .eq("id", orderId)
    .maybeSingle();

  const { data: holds } = await admin
    .from("gift_card_holds")
    .select("id,status")
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (!holds?.length) {
    if (restore && order && Number(order.gift_card_redeem_amount ?? 0) > 0) {
      const baseTotal = Math.max(
        0,
        Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0),
      );
      await admin
        .from("orders")
        .update({
          gift_card_id: null,
          gift_card_redeem_amount: 0,
          total: Number(baseTotal.toFixed(2)),
        })
        .eq("id", orderId);
    }
    return;
  }

  const now = new Date().toISOString();
  await admin
    .from("gift_card_holds")
    .update({ status: "released", released_at: now })
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (restore && order && order.payment_status !== "paid") {
    const baseTotal = Math.max(
      0,
      Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0),
    );
    await admin
      .from("orders")
      .update({
        gift_card_id: null,
        gift_card_redeem_amount: 0,
        total: Number(baseTotal.toFixed(2)),
      })
      .eq("id", orderId);
  }
}

/** Ödeme başarılı: hold → redeem, bakiye düş, sipariş alanları zaten set. */
export async function captureGiftCardRedemptionForOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: hold } = await admin
    .from("gift_card_holds")
    .select("id,gift_card_id,amount_held,status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!hold) return;

  if (hold.status === "captured") return;

  if (hold.status !== "pending") return;

  const amountHeld = Number(hold.amount_held);
  if (!Number.isFinite(amountHeld) || amountHeld <= 0) return;

  const { data: card, error: cardError } = await admin
    .from("gift_cards")
    .select("id,balance_remaining,status")
    .eq("id", hold.gift_card_id)
    .maybeSingle();

  if (cardError || !card) return;

  const currentBalance = Number(card.balance_remaining);
  const newBalance = Math.max(0, Number((currentBalance - amountHeld).toFixed(2)));
  const newStatus = newBalance <= 0 ? "depleted" : card.status === "active" ? "active" : card.status;

  const { error: ledgerError } = await admin.from("gift_card_ledger").insert({
    gift_card_id: hold.gift_card_id,
    order_id: orderId,
    amount: amountHeld,
    entry_type: "redeem",
    balance_after: newBalance,
    note: `Redeemed on paid order ${orderId}`,
  });

  if (ledgerError) {
    if (ledgerError.code === "23505") {
      await admin
        .from("gift_card_holds")
        .update({ status: "captured", released_at: null })
        .eq("id", hold.id);
    }
    return;
  }

  await admin
    .from("gift_cards")
    .update({
      balance_remaining: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hold.gift_card_id);

  await admin
    .from("gift_card_holds")
    .update({ status: "captured", released_at: null })
    .eq("id", hold.id);

  await admin
    .from("orders")
    .update({
      gift_card_id: hold.gift_card_id,
      gift_card_redeem_amount: amountHeld,
    })
    .eq("id", orderId);
}
