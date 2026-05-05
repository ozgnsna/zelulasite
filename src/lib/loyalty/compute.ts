import {
  ZELULA_PUAN_MIN_CART_SUBTOTAL_TRY,
  ZELULA_PUAN_PER_100_TRY,
  ZELULA_PUAN_REDEEM_COST,
  ZELULA_PUAN_REDEEM_DISCOUNT_TRY,
} from "@/lib/loyalty/constants";

/** Points earned from a single paid order total (TRY), after discounts. */
export function zelulaPuanEarnedFromPaidOrderTotalTry(totalTry: number): number {
  const t = Number(totalTry);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.floor(t / 100) * ZELULA_PUAN_PER_100_TRY;
}

export function canApplyZelulaPuanRedeem(subtotalBeforeLoyaltyTry: number): boolean {
  const s = Number(subtotalBeforeLoyaltyTry);
  return Number.isFinite(s) && s >= ZELULA_PUAN_MIN_CART_SUBTOTAL_TRY;
}

export function zelulaPuanRedeemDiscountTry(): number {
  return ZELULA_PUAN_REDEEM_DISCOUNT_TRY;
}

export function zelulaPuanRedeemCost(): number {
  return ZELULA_PUAN_REDEEM_COST;
}

/** Points still needed to unlock the next 50 TL benefit (100-point tier). */
export function zelulaPuanPointsToNextTier(availablePoints: number): number {
  const b = Math.max(0, Math.floor(Number(availablePoints) || 0));
  if (b >= 100) return 0;
  return 100 - b;
}

/** Progress 0–100 toward the next 100-point tier. */
export function zelulaPuanProgressToNextTierPercent(availablePoints: number): number {
  const b = Math.max(0, Math.floor(Number(availablePoints) || 0));
  const within = b % 100;
  return within;
}
