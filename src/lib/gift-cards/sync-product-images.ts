import type { SupabaseClient } from "@supabase/supabase-js";
import { getGiftCardProductImagePublicUrl } from "@/lib/gift-cards/product-image";

export type SyncGiftCardProductImagesResult = {
  ok: boolean;
  imageUrl: string | null;
  denominationsUpdated: number;
  productImagesUpdated: number;
  productImagesInserted: number;
  error?: string;
};

/** Tüm aktif denomination + gift_card ürünlerine aynı kapak görselini yazar. */
export async function syncGiftCardProductImages(
  admin: SupabaseClient,
): Promise<SyncGiftCardProductImagesResult> {
  const imageUrl = getGiftCardProductImagePublicUrl();
  if (!imageUrl) {
    return {
      ok: false,
      imageUrl: null,
      denominationsUpdated: 0,
      productImagesUpdated: 0,
      productImagesInserted: 0,
      error: "Görsel URL üretilemedi (NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_GIFT_CARD_IMAGE_URL).",
    };
  }

  const { data: denomRows, error: denomError } = await admin
    .from("gift_card_denominations")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("is_active", true)
    .select("id");

  if (denomError) {
    return {
      ok: false,
      imageUrl,
      denominationsUpdated: 0,
      productImagesUpdated: 0,
      productImagesInserted: 0,
      error: denomError.message,
    };
  }

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id")
    .eq("product_kind", "gift_card");

  if (productsError) {
    return {
      ok: false,
      imageUrl,
      denominationsUpdated: denomRows?.length ?? 0,
      productImagesUpdated: 0,
      productImagesInserted: 0,
      error: productsError.message,
    };
  }

  let productImagesUpdated = 0;
  let productImagesInserted = 0;

  for (const product of products ?? []) {
    const productId = String(product.id);
    const { data: existing } = await admin
      .from("product_images")
      .select("id,image_url")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1);

    const row = existing?.[0];
    if (row?.id) {
      if (row.image_url === imageUrl) continue;
      const { error } = await admin
        .from("product_images")
        .update({ image_url: imageUrl, is_cover: true })
        .eq("id", row.id);
      if (!error) productImagesUpdated += 1;
    } else {
      const { error } = await admin.from("product_images").insert({
        product_id: productId,
        image_url: imageUrl,
        is_cover: true,
        sort_order: 0,
      });
      if (!error) productImagesInserted += 1;
    }
  }

  return {
    ok: true,
    imageUrl,
    denominationsUpdated: denomRows?.length ?? 0,
    productImagesUpdated,
    productImagesInserted,
  };
}
