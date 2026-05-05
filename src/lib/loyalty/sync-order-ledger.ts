import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserLoyaltyBalance } from "@/lib/loyalty/balance";
import { zelulaPuanEarnedFromPaidOrderTotalTry } from "@/lib/loyalty/compute";
import {
  loyaltyClawbackEarnDescription,
  loyaltyEarnOrderDescription,
  loyaltyReferralEarnDescription,
  loyaltyReferralFriendBonusDescription,
  loyaltyReferralFriendBonusReversalDescription,
  loyaltyReferralReversalDescription,
  loyaltyRedeemOrderDescription,
  loyaltyRedeemReleaseDescription,
} from "@/lib/loyalty/ledger-descriptions";
import { ZELULA_PUAN_REDEEM_COST } from "@/lib/loyalty/constants";
import { logPayment } from "@/lib/payments/logger";
import {
  ZELULA_REFERRAL_FRIEND_FIRST_ORDER_POINTS,
  ZELULA_REFERRAL_REFERRER_ORDER_POINTS,
} from "@/lib/referral/constants";

type LedgerRow = {
  id: string;
  type: string;
  points: number;
  description: string | null;
};

/**
 * Keeps loyalty ledger in sync with order payment / cancellation state.
 * Call after order transitions (payment callback, admin updates, manual paid).
 */
export async function syncLoyaltyLedgersForOrder(admin: SupabaseClient, orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("id,user_id,referrer_user_id,payment_status,order_status,total,loyalty_redeem_points")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const qualifies =
    order.payment_status === "paid" && String(order.order_status ?? "") !== "cancelled";

  const earnPoints = qualifies ? zelulaPuanEarnedFromPaidOrderTotalTry(Number(order.total)) : 0;
  const wantRedeem = qualifies && Number(order.loyalty_redeem_points ?? 0) >= ZELULA_PUAN_REDEEM_COST;
  const referralPoints =
    qualifies && order.referrer_user_id ? ZELULA_REFERRAL_REFERRER_ORDER_POINTS : 0;

  const { data: rowsRaw } = await admin
    .from("loyalty_points_ledger")
    .select("id,type,points,description")
    .eq("order_id", orderId);

  const rows = (rowsRaw ?? []) as LedgerRow[];

  const earnDesc = loyaltyEarnOrderDescription(orderId);
  const clawDesc = loyaltyClawbackEarnDescription(orderId);
  const redeemDesc = loyaltyRedeemOrderDescription(orderId);
  const releaseDesc = loyaltyRedeemReleaseDescription(orderId);
  const referralDesc = loyaltyReferralEarnDescription(orderId);
  const referralReverseDesc = loyaltyReferralReversalDescription(orderId);
  const friendBonusDesc = loyaltyReferralFriendBonusDescription(orderId);
  const friendBonusReverseDesc = loyaltyReferralFriendBonusReversalDescription(orderId);

  const earnRow = rows.find((r) => r.type === "earned" && r.description === earnDesc);
  const hasClawbackEarn = rows.some((r) => r.type === "reversed" && r.description === clawDesc);
  const redeemRow = rows.find((r) => r.type === "redeemed" && r.description === redeemDesc);
  const hasRedeemRelease = rows.some((r) => r.type === "reversed" && r.description === releaseDesc);
  const referralRow = rows.find((r) => r.type === "referral_earned" && r.description === referralDesc);
  const hasReferralReverse = rows.some((r) => r.type === "reversed" && r.description === referralReverseDesc);
  const friendBonusRow = rows.find((r) => r.type === "earned" && r.description === friendBonusDesc);
  const hasFriendBonusReverse = rows.some(
    (r) => r.type === "reversed" && r.description === friendBonusReverseDesc,
  );

  if (!order?.user_id && !order?.referrer_user_id) return;

  if (!qualifies && earnRow && !hasClawbackEarn && order.user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.user_id,
      order_id: orderId,
      points: -earnRow.points,
      type: "reversed",
      description: clawDesc,
    });
  }

  if (!qualifies && redeemRow && !hasRedeemRelease && order.user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.user_id,
      order_id: orderId,
      points: -redeemRow.points,
      type: "reversed",
      description: releaseDesc,
    });
  }

  if (qualifies && earnPoints > 0 && !earnRow && order.user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.user_id,
      order_id: orderId,
      points: earnPoints,
      type: "earned",
      description: earnDesc,
    });
  }

  if (wantRedeem && !redeemRow && order.user_id) {
    const balance = await getUserLoyaltyBalance(admin, order.user_id);
    if (balance >= ZELULA_PUAN_REDEEM_COST) {
      await admin.from("loyalty_points_ledger").insert({
        user_id: order.user_id,
        order_id: orderId,
        points: -ZELULA_PUAN_REDEEM_COST,
        type: "redeemed",
        description: redeemDesc,
      });
    } else {
      logPayment("warn", "Loyalty redeem skipped at settlement (insufficient points).", {
        orderId,
        userId: order.user_id,
        balance,
      });
    }
  }

  if (!qualifies && referralRow && !hasReferralReverse && order.referrer_user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.referrer_user_id,
      order_id: orderId,
      points: -referralRow.points,
      type: "reversed",
      description: referralReverseDesc,
    });
  }

  if (!qualifies && friendBonusRow && !hasFriendBonusReverse && order.user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.user_id,
      order_id: orderId,
      points: -friendBonusRow.points,
      type: "reversed",
      description: friendBonusReverseDesc,
    });
  }

  if (qualifies && referralPoints > 0 && !referralRow && order.referrer_user_id) {
    await admin.from("loyalty_points_ledger").insert({
      user_id: order.referrer_user_id,
      order_id: orderId,
      points: referralPoints,
      type: "referral_earned",
      description: referralDesc,
    });
  }

  if (
    qualifies &&
    order.referrer_user_id &&
    order.user_id &&
    !friendBonusRow &&
    ZELULA_REFERRAL_FRIEND_FIRST_ORDER_POINTS > 0
  ) {
    const { count, error: countErr } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", order.user_id)
      .eq("payment_status", "paid")
      .neq("order_status", "cancelled")
      .not("referrer_user_id", "is", null);

    if (countErr) {
      logPayment("warn", "Referral friend bonus skipped (paid referred order count failed).", {
        orderId,
        userId: order.user_id,
        message: countErr.message,
      });
    } else if (count === 1) {
      await admin.from("loyalty_points_ledger").insert({
        user_id: order.user_id,
        order_id: orderId,
        points: ZELULA_REFERRAL_FRIEND_FIRST_ORDER_POINTS,
        type: "earned",
        description: friendBonusDesc,
      });
    }
  }
}
