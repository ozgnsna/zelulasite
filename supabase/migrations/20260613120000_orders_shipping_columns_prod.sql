-- Prod’da eksik kaldıysa: Supabase Dashboard → SQL Editor → Run
-- Teslim et + DHL kargo için gerekli kolonlar.

alter table public.orders add column if not exists shipping_provider text;
alter table public.orders add column if not exists shipping_tracking_number text;
alter table public.orders add column if not exists shipping_label_url text;
alter table public.orders add column if not exists shipping_status text;
alter table public.orders add column if not exists shipping_created_at timestamptz;

comment on column public.orders.shipping_provider is 'Kargo sağlayıcı kodu (örn. dhl).';
comment on column public.orders.shipping_tracking_number is 'Takip numarası.';
comment on column public.orders.shipping_label_url is 'Etiket PDF/URL (sağlayıcıdan).';
comment on column public.orders.shipping_status is 'Kargo durumu (örn. created, hand_delivered).';
comment on column public.orders.shipping_created_at is 'Gönderi oluşturulma zamanı.';
