import type { SupabaseClient } from "@supabase/supabase-js";

export const REVIEW_IMAGES_BUCKET = "product-images";
export const REVIEW_IMAGE_MAX_BYTES = 4_000_000;

export function isAllowedReviewImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function storageObjectPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length).split("?")[0] ?? "");
}

function reviewImageExtension(file: File): string {
  const type = file.type.toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadReviewImage(
  admin: SupabaseClient,
  params: { userId: string; productId: string; file: File },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { userId, productId, file } = params;

  if (!isAllowedReviewImageFile(file)) {
    return { ok: false, error: "Yalnızca JPG, PNG veya WebP yükleyebilirsin." };
  }
  if (file.size > REVIEW_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Fotoğraf en fazla 4 MB olabilir." };
  }

  const ext = reviewImageExtension(file);
  const path = `reviews/${userId}/${productId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from(REVIEW_IMAGES_BUCKET).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, error: "Fotoğraf yüklenemedi. Lütfen tekrar dene." };
  }

  const { data } = admin.storage.from(REVIEW_IMAGES_BUCKET).getPublicUrl(path);
  const url = String(data.publicUrl ?? "").trim();
  if (!url) return { ok: false, error: "Fotoğraf adresi oluşturulamadı." };
  return { ok: true, url };
}

export async function removeReviewImageIfStored(admin: SupabaseClient, imageUrl: string | null | undefined): Promise<void> {
  const url = String(imageUrl ?? "").trim();
  if (!url) return;
  const objectPath = storageObjectPathFromPublicUrl(url, REVIEW_IMAGES_BUCKET);
  if (!objectPath || !objectPath.startsWith("reviews/")) return;
  await admin.storage.from(REVIEW_IMAGES_BUCKET).remove([objectPath]);
}
