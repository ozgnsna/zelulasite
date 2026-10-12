"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProductReviewStatus } from "@/lib/account/reviews";
import { grantLoyaltyForApprovedReview } from "@/lib/loyalty/grant-review-reward";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");
}

function revalidateReviewPaths(productSlug?: string | null) {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/urunler");
  if (productSlug) revalidatePath(`/urunler/${productSlug}`);
}

export async function moderateProductReviewAction(formData: FormData) {
  await assertAdminUser();

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim() as ProductReviewStatus;
  const productSlug = String(formData.get("productSlug") ?? "").trim();

  if (!reviewId) return;
  if (!["approved", "rejected", "hidden", "pending"].includes(nextStatus)) return;

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("customer_product_reviews")
    .select("id,user_id,order_id,status")
    .eq("id", reviewId)
    .maybeSingle();

  const { error } = await admin
    .from("customer_product_reviews")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (error) return;

  if (nextStatus === "approved" && before && before.status !== "approved") {
    let rewardUserId = before.user_id ? String(before.user_id) : "";
    if (!rewardUserId && before.order_id) {
      const { data: order } = await admin.from("orders").select("user_id").eq("id", before.order_id).maybeSingle();
      rewardUserId = order?.user_id ? String(order.user_id) : "";
    }
    if (rewardUserId) {
      await grantLoyaltyForApprovedReview(admin, { userId: rewardUserId, reviewId });
    }
  }

  revalidateReviewPaths(productSlug || null);
  redirect("/admin/reviews");
}
