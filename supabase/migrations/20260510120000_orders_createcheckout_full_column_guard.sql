-- createCheckout / orders INSERT ile uyum: prod’da eksik kalan tüm sipariş sütunları (idempotent).
-- Önceki migration’lar uygulanmamış projelerde "sipariş sütunları eksik" hatasını giderir.

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

alter table public.orders
  add column if not exists currency text not null default 'TRY';

alter table public.orders
  add column if not exists payment_status text not null default 'pending';

alter table public.orders
  add column if not exists order_status text not null default 'pending';

alter table public.orders
  add column if not exists payment_provider text;

alter table public.orders
  add column if not exists payment_reference text;

alter table public.orders
  add column if not exists shipping_address_json jsonb;

alter table public.orders
  add column if not exists accept_distance_sales boolean not null default false;

alter table public.orders
  add column if not exists accept_pre_contract_info boolean not null default false;

alter table public.orders
  add column if not exists legal_accepted_at timestamptz;

alter table public.orders
  add column if not exists legal_ip text;

alter table public.orders
  add column if not exists legal_user_agent text;

alter table public.orders
  add column if not exists legal_contract_version text not null default 'v1';

alter table public.orders
  add column if not exists legal_contract_snapshot jsonb;

alter table public.orders
  add column if not exists legal_contract_hash text;

alter table public.orders
  add column if not exists kvkk_consent boolean not null default false;

alter table public.orders
  add column if not exists kvkk_consent_at timestamptz;

alter table public.orders
  add column if not exists shipping_provider text;

alter table public.orders
  add column if not exists shipping_tracking_number text;

alter table public.orders
  add column if not exists shipping_label_url text;

alter table public.orders
  add column if not exists shipping_status text;

alter table public.orders
  add column if not exists shipping_created_at timestamptz;

alter table public.orders
  add column if not exists created_at timestamptz default now();

alter table public.orders
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_orders_user_id on public.orders (user_id);

create index if not exists idx_orders_referrer_user_id
  on public.orders (referrer_user_id)
  where referrer_user_id is not null;

create index if not exists idx_orders_order_status on public.orders (order_status);

create index if not exists idx_orders_payment_status on public.orders (payment_status);
