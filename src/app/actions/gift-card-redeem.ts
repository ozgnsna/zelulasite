"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { GiftCardApplyResult } from "@/lib/gift-cards/redeem";
import { applyGiftCardToOrder, previewGiftCardRedemption } from "@/lib/gift-cards/redeem";

export type { GiftCardApplyResult } from "@/lib/gift-cards/redeem";

/** Checkout önizlemesi (sipariş yokken). */
export async function previewGiftCard(code: string, orderTotal: number): Promise<GiftCardApplyResult> {
  const admin = createAdminClient();
  const total = Number(orderTotal);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Hediye kartı için geçerli bir sipariş tutarı gerekli." };
  }
  return previewGiftCardRedemption(admin, code, total);
}

/** Siparişe hold oluşturur ve tutarı düşer. */
export async function applyGiftCard(code: string, orderId: string): Promise<GiftCardApplyResult> {
  const trimmedCode = code.trim();
  const trimmedOrderId = orderId.trim();
  if (!trimmedCode) return { ok: false, error: "Hediye kartı kodu girin." };
  if (!trimmedOrderId) return { ok: false, error: "Sipariş bulunamadı." };

  const admin = createAdminClient();
  return applyGiftCardToOrder(admin, trimmedCode, trimmedOrderId);
}
