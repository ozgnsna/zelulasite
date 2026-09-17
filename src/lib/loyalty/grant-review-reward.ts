import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loyaltyReviewEarnDescription,
  ZELULA_PUAN_PER_APPROVED_REVIEW,
} from "@/lib/loyalty/review-reward";

/**
 * Onaylanan yorum için 25 Zelula Puan.
 * Unique index (description like review:%) ile çift kayıt engellenir.
 */
export async function grantLoyaltyForApprovedReview(
  admin: SupabaseClient,
  params: { userId: string; reviewId: string },
): Promise<{ ok: boolean; alreadyGranted?: boolean; error?: string }> {
  const userId = String(params.userId ?? "").trim();
  const reviewId = String(params.reviewId ?? "").trim();
  if (!userId || !reviewId) return { ok: false, error: "missing_ids" };

  const description = loyaltyReviewEarnDescription(reviewId);
  const { error } = await admin.from("loyalty_points_ledger").insert({
    user_id: userId,
    order_id: null,
    points: ZELULA_PUAN_PER_APPROVED_REVIEW,
    type: "earned",
    description,
  });

  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { ok: true, alreadyGranted: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
