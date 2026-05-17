/** Supabase Storage: `product-images` bucket, kök dosya adı. */
export const GIFT_CARD_PRODUCT_IMAGE_BUCKET = "product-images";
export const GIFT_CARD_PRODUCT_IMAGE_OBJECT = "zelula-gift-card.svg";

/**
 * Mağaza / kategori kartları ve admin senkronu için public görsel URL.
 * Öncelik: NEXT_PUBLIC_GIFT_CARD_IMAGE_URL → Supabase Storage public URL.
 */
export function getGiftCardProductImagePublicUrl(): string | null {
  const override = process.env.NEXT_PUBLIC_GIFT_CARD_IMAGE_URL?.trim();
  if (override) return override;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;

  return `${base}/storage/v1/object/public/${GIFT_CARD_PRODUCT_IMAGE_BUCKET}/${GIFT_CARD_PRODUCT_IMAGE_OBJECT}`;
}
