"use server";

import { revalidatePath } from "next/cache";
import { syncGiftCardProductImages } from "@/lib/gift-cards/sync-product-images";
import { getGiftCardProductImagePublicUrl } from "@/lib/gift-cards/product-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Oturum gerekli." };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) {
    return { ok: false as const, error: "Yetkisiz." };
  }
  return { ok: true as const };
}

export type GiftCardImageSyncState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function syncGiftCardProductImagesAction(
  _prev: GiftCardImageSyncState | undefined,
  _formData: FormData,
): Promise<GiftCardImageSyncState> {
  const gate = await assertAdminUser();
  if (!gate.ok) return gate;

  const admin = createAdminClient();
  const result = await syncGiftCardProductImages(admin);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Senkronizasyon başarısız." };
  }

  revalidatePath("/admin/gift-cards");
  revalidatePath("/hediye-karti");
  revalidatePath("/kategori/hediye-karti");
  revalidatePath("/sepet");
  revalidatePath("/");

  const parts = [
    `${result.denominationsUpdated} yüz değer`,
    `${result.productImagesUpdated} görsel güncellendi`,
    `${result.productImagesInserted} görsel eklendi`,
  ];
  return {
    ok: true,
    message: `Kapak görseli uygulandı (${parts.join(", ")}). URL: ${result.imageUrl}`,
  };
}

export async function getGiftCardProductImageUrlAction(): Promise<{ url: string | null }> {
  return { url: getGiftCardProductImagePublicUrl() };
}
