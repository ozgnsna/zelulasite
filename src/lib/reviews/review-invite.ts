import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isOrderDeliveredForReview, type ProductReviewRow } from "@/lib/account/reviews";

export const REVIEW_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashReviewInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createReviewInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isReviewInviteTokenShape(token: string): boolean {
  return token.length >= 20 && token.length <= 200 && token !== "1";
}

export type ValidReviewInvite = {
  tokenId: string;
  orderId: string;
  productId: string;
  orderUserId: string | null;
  customerName: string;
  review: ProductReviewRow | null;
};

export async function ensureReviewInvite(
  admin: SupabaseClient,
  orderId: string,
  productId: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const token = createReviewInviteToken();
  const tokenHash = hashReviewInviteToken(token);
  const expiresAt = new Date(Date.now() + REVIEW_INVITE_TTL_MS).toISOString();

  const { data: existing, error: readError } = await admin
    .from("review_invite_tokens")
    .select("id,used_at")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (existing?.used_at) return { ok: false, error: "used" };

  if (existing?.id) {
    const { error: updateError } = await admin
      .from("review_invite_tokens")
      .update({ token_hash: tokenHash, expires_at: expiresAt })
      .eq("id", existing.id)
      .is("used_at", null);
    if (updateError) return { ok: false, error: updateError.message };
    return { ok: true, token };
  }

  const { error: insertError } = await admin.from("review_invite_tokens").insert({
    token_hash: tokenHash,
    order_id: orderId,
    product_id: productId,
    expires_at: expiresAt,
  });
  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true, token };
}

export async function validateReviewInvite(
  admin: SupabaseClient,
  rawToken: string,
  expectedProductId?: string,
): Promise<{ ok: true; invite: ValidReviewInvite } | { ok: false }> {
  const token = String(rawToken ?? "").trim();
  if (!isReviewInviteTokenShape(token)) return { ok: false };

  const { data: row, error } = await admin
    .from("review_invite_tokens")
    .select("id,order_id,product_id,expires_at")
    .eq("token_hash", hashReviewInviteToken(token))
    .maybeSingle();
  if (error || !row) return { ok: false };

  const expires = Date.parse(String(row.expires_at ?? ""));
  if (!Number.isFinite(expires) || expires <= Date.now()) return { ok: false };
  if (expectedProductId && String(row.product_id) !== expectedProductId) return { ok: false };

  const { data: order } = await admin
    .from("orders")
    .select("id,user_id,customer_name,payment_status,order_status")
    .eq("id", row.order_id)
    .maybeSingle();
  if (!order) return { ok: false };
  if (String(order.payment_status ?? "") !== "paid") return { ok: false };
  if (!isOrderDeliveredForReview(String(order.order_status ?? ""))) return { ok: false };

  const { data: items } = await admin
    .from("order_items")
    .select("product_id")
    .eq("order_id", row.order_id)
    .eq("product_id", row.product_id)
    .limit(1);
  if (!items?.length) return { ok: false };

  const { data: review } = await admin
    .from("customer_product_reviews")
    .select("*")
    .eq("order_id", row.order_id)
    .eq("product_id", row.product_id)
    .maybeSingle();

  return {
    ok: true,
    invite: {
      tokenId: String(row.id),
      orderId: String(row.order_id),
      productId: String(row.product_id),
      orderUserId: order.user_id ? String(order.user_id) : null,
      customerName: String(order.customer_name ?? ""),
      review: (review as ProductReviewRow | null) ?? null,
    },
  };
}

export async function markReviewInviteUsed(
  admin: SupabaseClient,
  tokenId: string,
  reviewId: string,
): Promise<void> {
  await admin
    .from("review_invite_tokens")
    .update({ used_at: new Date().toISOString(), review_id: reviewId })
    .eq("id", tokenId)
    .is("used_at", null);
}
