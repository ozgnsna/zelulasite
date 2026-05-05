-- Checkout / createCheckout ile uyum: eksik sütunları güvenli şekilde ekle (eski projeler)

alter table public.orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.orders
  add column if not exists discount_amount numeric(10,2) not null default 0;

alter table public.orders
  add column if not exists discount_label text;

alter table public.orders
  add column if not exists loyalty_redeem_points int not null default 0;

alter table public.orders
  add column if not exists referrer_user_id uuid references auth.users (id) on delete set null;

alter table public.orders
  add column if not exists referral_code text;

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_referrer_user_id
  on public.orders (referrer_user_id)
  where referrer_user_id is not null;
