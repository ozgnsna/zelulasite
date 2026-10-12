import type { SupabaseClient } from "@supabase/supabase-js";
import { grantLoyaltyForApprovedReview } from "@/lib/loyalty/grant-review-reward";

/**
 * Onaylı misafir yorumunun puanını, siparişi bu hesaba bağlıysa deftere yazar.
 * review:{id} tekil satırı ikinci yazımı engeller.
 */
export async function claimGuestReviewPoints(admin: SupabaseClient, userId: string): Promise<void> {
  const uid = String(userId ?? "").trim();
  if (!uid) return;

  const { data: orders, error: orderError } = await admin.from("orders").select("id").eq("user_id", uid);
  if (orderError || !orders?.length) return;

  const orderIds = orders.map((row) => String(row.id));
  const { data: reviews, error: reviewError } = await admin
    .from("customer_product_reviews")
    .select("id")
    .in("order_id", orderIds)
    .is("user_id", null)
    .eq("status", "approved");
  if (reviewError || !reviews?.length) return;

  for (const review of reviews) {
    await grantLoyaltyForApprovedReview(admin, { userId: uid, reviewId: String(review.id) });
  }
}
