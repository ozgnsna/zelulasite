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
  const body = String(formData.get("body") ?? "").trim();

  if (!productId || !productSlug) return { ok: false, error: "Ürün bulunamadı." };
  if (rating == null) return { ok: false, error: "1–5 arası puan seçin." };
  if (body.length < 10) return { ok: false, error: "Yorum en az 10 karakter olmalı." };
  if (body.length > 2000) return { ok: false, error: "Yorum en fazla 2000 karakter olabilir." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Yorum yazmak için giriş yapmalısın." };

  const orderId = await findQualifyingOrderIdForProduct(supabase, user.id, productId);
  if (!orderId) {
    return { ok: false, error: "Bu ürün için yorum yalnızca ödenmiş siparişlerde yapılabilir." };
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
    const admin = createAdminClient();
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
  } else {
    const { error } = await supabase.from("customer_product_reviews").insert(payload);
    if (error) return { ok: false, error: "Yorum gönderilemedi." };
  }

  revalidateReviewSurfaces(productSlug);
  return { ok: true, status: "pending" };
}
