-- Cookie banner "pazarlama" tercihi; CAPI user_data yalnızca true iken hash'lenir.
-- Prod'a henüz uygulanmadı — Supabase SQL Editor ile elle çalıştırılacak.

alter table public.orders
  add column if not exists marketing_consent boolean not null default false;

comment on column public.orders.marketing_consent is
  'Checkout anında cookie marketing tercihi. true ise Meta CAPI e-posta/telefon hash gönderir.';
