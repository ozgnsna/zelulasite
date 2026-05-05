-- Sipariş indirimi (ör. Instagram takipçi kampanyası)
alter table public.orders
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists discount_label text;

comment on column public.orders.discount_amount is 'Ara toplamdan düşülen indirim (TRY).';
comment on column public.orders.discount_label is 'İndirim kaynağı etiketi (ör. instagram_takipci).';
