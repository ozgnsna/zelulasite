-- Yorum başına en fazla 1 fotoğraf (Supabase Storage public URL)

alter table public.customer_product_reviews
  add column if not exists image_url text;

comment on column public.customer_product_reviews.image_url is 'Müşteri yorum fotoğrafı (product-images/reviews/...).';
