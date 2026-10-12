"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  findQualifyingOrderIdForProduct,
  getUserProductReview,
  maskReviewerDisplayName,
} from "@/lib/account/reviews";
import { removeReviewImageIfStored, uploadReviewImage } from "@/lib/reviews/review-image-upload";
import { markReviewInviteUsed, validateReviewInvite, type ValidReviewInvite } from "@/lib/reviews/review-invite";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SubmitProductReviewResult = { ok: true; status: "pending" } | { ok: false; error: string };

function revalidateReviewSurfaces(productSlug: string) {
  revalidatePath("/hesabim");
  revalidatePath("/");
  revalidatePath("/urunler");
  revalidatePath(`/urunler/${productSlug}`);
  revalidatePath("/admin/reviews");
}

function parseRating(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export async function submitProductReview(formData: FormData): Promise<SubmitProductReviewResult> {
  const productId = String(formData.get("productId") ?? "").trim();
  const productSlug = String(formData.get("productSlug") ?? "").trim();
  const rating = parseRating(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);

  if (!productId || !productSlug) return { ok: false, error: "Ürün bulunamadı." };
  if (rating == null) return { ok: false, error: "1–5 arası puan seçin." };
  if (body.length < 10) return { ok: false, error: "Yorum en az 10 karakter olmalı." };
  if (body.length > 4000) return { ok: false, error: "Yorum en fazla 4000 karakter olabilir." };

  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const admin = createAdminClient();
  let matchedInvite: ValidReviewInvite | null = null;
  if (inviteToken) {
    const validated = await validateReviewInvite(admin, inviteToken, productId);
    if (!validated.ok) return { ok: false, error: "Bu yorum bağlantısı geçersiz veya süresi dolmuş." };
    const supabaseForInvite = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabaseForInvite.auth.getUser();
    const ownsOrder = Boolean(sessionUser?.id && validated.invite.orderUserId === sessionUser.id);
    if (!ownsOrder) {
      return writeGuestReview(admin, validated.invite, {
        productSlug,
        rating,
        title,
        body,
        imageFile: formData.get("image"),
      });
    }
    matchedInvite = validated.invite;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Yorum yazmak için giriş yapmalısın." };

  const orderId = await findQualifyingOrderIdForProduct(supabase, user.id, productId);
  if (!orderId) {
    return { ok: false, error: "Bu ürün için yorum, siparişin sana ulaştıktan (kargo veya elden teslim) sonra açılır." };
  }

  const { data: orderReview } = await admin
    .from("customer_product_reviews")
    .select("id,user_id")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();
  if (orderReview && String(orderReview.user_id ?? "") !== user.id) {
    return { ok: false, error: "Bu sipariş için yorum zaten iletildi." };
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const reviewerDisplayName = maskReviewerDisplayName(profile?.full_name);

  const existing = await getUserProductReview(supabase, user.id, productId);
  if (existing?.status === "approved") {
    return { ok: false, error: "Bu ürün için yorumun zaten yayında." };
  }

  const imageFile = formData.get("image");
  let imageUrl = existing?.image_url ?? null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadReviewImage(admin, { userId: user.id, productId, file: imageFile });
    if (!uploaded.ok) return uploaded;
    if (existing?.image_url && existing.image_url !== uploaded.url) {
      await removeReviewImageIfStored(admin, existing.image_url);
    }
    imageUrl = uploaded.url;
  }

  const payload = {
    user_id: user.id,
    product_id: productId,
    order_id: orderId,
    rating,
    title: title || null,
    body,
    image_url: imageUrl,
    reviewer_display_name: reviewerDisplayName,
    status: "pending" as const,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from("customer_product_reviews").update(payload).eq("id", existing.id);
    if (error) return { ok: false, error: "Yorum güncellenemedi." };
    if (matchedInvite) await markReviewInviteUsed(admin, matchedInvite.tokenId, existing.id);
  } else {
    const { error } = await supabase.from("customer_product_reviews").insert(payload);
    if (error) return { ok: false, error: "Yorum gönderilemedi." };
    if (matchedInvite) {
      const created = await getUserProductReview(supabase, user.id, productId);
      if (created?.id) await markReviewInviteUsed(admin, matchedInvite.tokenId, created.id);
    }
  }

  revalidateReviewSurfaces(productSlug);
  return { ok: true, status: "pending" };
}

async function writeGuestReview(
  admin: SupabaseClient,
  invite: ValidReviewInvite,
  input: {
    productSlug: string;
    rating: number;
    title: string;
    body: string;
    imageFile: FormDataEntryValue | null;
  },
): Promise<SubmitProductReviewResult> {
  const existing = invite.review;
  if (existing?.status === "approved") return { ok: false, error: "Bu ürün için yorumun zaten yayında." };
  if (existing?.status === "pending") return { ok: false, error: "Yorumun zaten inceleniyor." };

  let imageUrl = existing?.image_url ?? null;
  if (input.imageFile instanceof File && input.imageFile.size > 0) {
    const uploaded = await uploadReviewImage(admin, {
      storagePrefix: `orders/${invite.orderId}`,
      productId: invite.productId,
      file: input.imageFile,
    });
    if (!uploaded.ok) return uploaded;
    if (existing?.image_url && existing.image_url !== uploaded.url) {
      await removeReviewImageIfStored(admin, existing.image_url);
    }
    imageUrl = uploaded.url;
  }

  const payload = {
    user_id: null,
    product_id: invite.productId,
    order_id: invite.orderId,
    rating: input.rating,
    title: input.title || null,
    body: input.body,
    image_url: imageUrl,
    reviewer_display_name: maskReviewerDisplayName(invite.customerName),
    status: "pending" as const,
    updated_at: new Date().toISOString(),
  };

  let reviewId = existing?.id ?? "";
  if (existing?.id && (existing.status === "rejected" || existing.status === "hidden")) {
    const { error } = await admin.from("customer_product_reviews").update(payload).eq("id", existing.id);
    if (error) return { ok: false, error: "Yorum güncellenemedi." };
    reviewId = existing.id;
  } else if (!existing?.id) {
    const { data: inserted, error } = await admin
      .from("customer_product_reviews")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error || !inserted?.id) {
      if (error && /duplicate|unique/i.test(error.message)) {
        return { ok: false, error: "Bu sipariş için yorum zaten iletildi." };
      }
      return { ok: false, error: "Yorum gönderilemedi." };
    }
    reviewId = String(inserted.id);
  } else {
    return { ok: false, error: "Bu sipariş için yorum zaten iletildi." };
  }

  await markReviewInviteUsed(admin, invite.tokenId, reviewId);
  revalidateReviewSurfaces(input.productSlug);
  return { ok: true, status: "pending" };
}
