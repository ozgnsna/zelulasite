-- Hediye kartı kapak görseli (product-images/zelula-gift-card.svg)
--
-- Storage:
--   npm run upload:gift-card-image
-- veya Dashboard → Storage → product-images → zelula-gift-card.svg
--
-- Veritabanı (denominations.image_url + product_images):
--   Admin → Hediye kartları → «Görseli veritabanına uygula»
-- veya deploy sonrası uygulama NEXT_PUBLIC_SUPABASE_URL ile URL üretir.
--
-- Tam URL override: NEXT_PUBLIC_GIFT_CARD_IMAGE_URL

comment on column public.gift_card_denominations.image_url is
  'Kapak görseli; varsayılan Storage: product-images/zelula-gift-card.svg';
