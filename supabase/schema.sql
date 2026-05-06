create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  parent_id uuid references categories(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null,
  full_description text not null,
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  sku text not null unique,
  stock_quantity int not null default 0,
  featured boolean not null default false,
  new_arrival boolean not null default false,
  category_id uuid references categories(id) on delete set null,
  collection_id uuid references collections(id) on delete set null,
  material text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  address_line text not null,
  city text not null,
  district text not null,
  postal_code text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  subtotal numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  discount_label text,
  total numeric(10,2) not null,
  loyalty_redeem_points int not null default 0,
  referrer_user_id uuid references auth.users(id) on delete set null,
  referral_code text,
  currency text not null default 'TRY',
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  payment_provider text,
  payment_reference text,
  shipping_address_json jsonb,
  accept_distance_sales boolean not null default false,
  accept_pre_contract_info boolean not null default false,
  legal_accepted_at timestamptz,
  legal_ip text,
  legal_user_agent text,
  legal_contract_version text not null default 'v1',
  legal_contract_snapshot jsonb,
  legal_contract_hash text,
  kvkk_consent boolean not null default false,
  kvkk_consent_at timestamptz,
  shipping_provider text,
  shipping_tracking_number text,
  shipping_label_url text,
  shipping_status text,
  shipping_created_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists payment_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  provider text not null,
  event_type text not null default 'callback',
  status text not null,
  request_payload jsonb,
  response_payload jsonb,
  callback_payload jsonb,
  callback_hash text,
  verification_status text,
  verification_error text,
  reference text,
  processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  occurred_at timestamptz not null default now(),
  page_path text,
  client_id text,
  ecommerce jsonb,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_order_status on orders(order_status);
create index if not exists idx_orders_email on orders(email);
create index if not exists idx_orders_provider_reference on orders(payment_provider, payment_reference);

create index if not exists idx_order_items_order_id on order_items(order_id);

create index if not exists idx_payment_logs_order_id_created on payment_logs(order_id, created_at desc);
create index if not exists idx_payment_logs_provider_reference on payment_logs(provider, reference);
create unique index if not exists uq_payment_logs_callback_hash on payment_logs(callback_hash)
  where callback_hash is not null;
create unique index if not exists uq_orders_provider_reference on orders(payment_provider, payment_reference)
  where payment_reference is not null;
create index if not exists idx_analytics_events_name_time on analytics_events(event_name, occurred_at desc);
create index if not exists idx_analytics_events_time on analytics_events(occurred_at desc);

alter table categories enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table payment_logs enable row level security;
alter table analytics_events enable row level security;

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  referral_code text unique,
  referral_first_share_rewarded_at timestamptz,
  phone text,
  birth_date date,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists customer_saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Adres',
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  district text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_saved_addresses_user_id on customer_saved_addresses(user_id);
create index if not exists idx_customer_saved_addresses_user_default on customer_saved_addresses(user_id, is_default desc);

alter table customer_saved_addresses enable row level security;

drop policy if exists "saved_addresses_select_own" on customer_saved_addresses;
create policy "saved_addresses_select_own" on customer_saved_addresses
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_insert_own" on customer_saved_addresses;
create policy "saved_addresses_insert_own" on customer_saved_addresses
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_update_own" on customer_saved_addresses;
create policy "saved_addresses_update_own" on customer_saved_addresses
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_delete_own" on customer_saved_addresses;
create policy "saved_addresses_delete_own" on customer_saved_addresses
  for delete using (auth.uid() is not null and user_id = auth.uid());

create table if not exists customer_product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_customer_product_favorites_user_id on customer_product_favorites(user_id);
create index if not exists idx_customer_product_favorites_product_id on customer_product_favorites(product_id);

alter table customer_product_favorites enable row level security;

drop policy if exists "product_favorites_select_own" on customer_product_favorites;
create policy "product_favorites_select_own" on customer_product_favorites
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "product_favorites_insert_own" on customer_product_favorites;
create policy "product_favorites_insert_own" on customer_product_favorites
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "product_favorites_delete_own" on customer_product_favorites;
create policy "product_favorites_delete_own" on customer_product_favorites
  for delete using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "orders_select_own" on orders;
create policy "orders_select_own" on orders for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "order_items_select_own" on order_items;
create policy "order_items_select_own" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bd text;
  bd_parsed date;
begin
  bd := nullif(trim(new.raw_user_meta_data->>'birth_date'), '');
  bd_parsed := null;
  if bd is not null and bd ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      bd_parsed := bd::date;
    exception when others then
      bd_parsed := null;
    end;
  end if;

  insert into public.profiles (id, full_name, phone, birth_date)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    bd_parsed
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (is_active = true);
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read collections" on collections;
create policy "public read collections" on collections for select using (true);
drop policy if exists "public read product_images" on product_images;
create policy "public read product_images" on product_images for select using (true);

comment on column orders.order_number is 'Critical reconciliation key visible to business operations.';
comment on column orders.payment_reference is 'Provider transaction/reference id, unique when present.';
comment on column orders.payment_status is 'Payment lifecycle state for reconciliation and finance.';
comment on column payment_logs.callback_hash is 'Callback signature/hash key used for idempotency.';
comment on column payment_logs.callback_payload is 'Raw callback payload (JSONB) stored for audits.';
comment on column payment_logs.verification_status is 'Signature verification result for callback.';

-- Loyalty (Zelula Puan); see migrations for incremental deploy.
alter table public.orders
  add column if not exists loyalty_redeem_points int not null default 0;
alter table public.orders
  add column if not exists referrer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists referral_code text;

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
  add column if not exists kvkk_consent boolean not null default false;
alter table public.orders
  add column if not exists kvkk_consent_at timestamptz;
alter table public.orders
  add column if not exists legal_contract_hash text;
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

create table if not exists public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points int not null,
  type text not null check (type in ('earned', 'redeemed', 'reversed', 'referral_earned')),
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_loyalty_earn_order_desc
  on public.loyalty_points_ledger (order_id, description)
  where type = 'earned' and order_id is not null and description is not null;

create unique index if not exists uq_loyalty_redeemed_per_order
  on public.loyalty_points_ledger (order_id)
  where type = 'redeemed';

create index if not exists idx_loyalty_ledger_user_created
  on public.loyalty_points_ledger (user_id, created_at desc);

create index if not exists idx_orders_referrer_user_id
  on public.orders (referrer_user_id)
  where referrer_user_id is not null;

create unique index if not exists uq_loyalty_referral_per_order_user
  on public.loyalty_points_ledger (order_id, user_id)
  where type = 'referral_earned' and order_id is not null;

create unique index if not exists uq_loyalty_first_share_per_user
  on public.loyalty_points_ledger (user_id)
  where type = 'earned' and description like 'FIRST_REFERRAL_SHARE:%';

alter table public.loyalty_points_ledger enable row level security;

drop policy if exists "loyalty_ledger_select_own" on public.loyalty_points_ledger;
create policy "loyalty_ledger_select_own" on public.loyalty_points_ledger
  for select using (auth.uid() is not null and user_id = auth.uid());

-- Marketplace foundation (Trendyol)
create table if not exists public.marketplace_integrations (
  id uuid primary key default gen_random_uuid(),
  marketplace text not null check (marketplace in ('trendyol')),
  environment text not null default 'stage' check (environment in ('stage', 'prod')),
  seller_id text,
  supplier_id text,
  api_key text,
  api_secret text,
  is_active boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketplace)
);

create table if not exists public.marketplace_product_links (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.marketplace_integrations(id) on delete cascade,
  marketplace text not null check (marketplace in ('trendyol')),
  product_id uuid not null references public.products(id) on delete cascade,
  external_product_code text,
  external_listing_id text,
  barcode text,
  stock_code text,
  batch_request_id text,
  status text not null default 'pending' check (status in ('pending', 'synced', 'failed', 'skipped')),
  last_error text,
  last_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, product_id)
);

create index if not exists idx_marketplace_links_marketplace_status
  on public.marketplace_product_links (marketplace, status, updated_at desc);

create table if not exists public.marketplace_sync_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.marketplace_integrations(id) on delete set null,
  marketplace text not null check (marketplace in ('trendyol')),
  entity_type text not null check (entity_type in ('integration', 'product', 'inventory', 'order', 'import', 'batch', 'category')),
  entity_id text,
  action text not null,
  status text not null check (status in ('success', 'error', 'skipped', 'pending')),
  message text,
  batch_request_id text,
  request_payload jsonb,
  response_payload jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_sync_logs_main
  on public.marketplace_sync_logs (marketplace, entity_type, created_at desc);

create table if not exists public.marketplace_category_attribute_cache (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.marketplace_integrations(id) on delete cascade,
  marketplace text not null default 'trendyol' check (marketplace = 'trendyol'),
  category_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (integration_id, category_id)
);

create index if not exists idx_marketplace_cat_attr_cache_fetched
  on public.marketplace_category_attribute_cache (fetched_at desc);

alter table public.marketplace_category_attribute_cache enable row level security;

create table if not exists public.marketplace_category_tree_cache (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.marketplace_integrations(id) on delete cascade,
  marketplace text not null default 'trendyol' check (marketplace = 'trendyol'),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (integration_id)
);

create index if not exists idx_marketplace_cat_tree_cache_fetched
  on public.marketplace_category_tree_cache (fetched_at desc);

alter table public.marketplace_category_tree_cache enable row level security;

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.marketplace_integrations(id) on delete set null,
  marketplace text not null check (marketplace in ('trendyol')),
  external_order_id text not null,
  local_order_id uuid references public.orders(id) on delete set null,
  order_number text,
  order_status text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketplace, external_order_id)
);

alter table public.products
  add column if not exists trendyol_barcode text,
  add column if not exists trendyol_stock_code text,
  add column if not exists trendyol_brand text,
  add column if not exists trendyol_category_id text,
  add column if not exists trendyol_category_attributes jsonb not null default '[]'::jsonb,
  add column if not exists trendyol_vat_rate int not null default 20,
  add column if not exists trendyol_list_price numeric(10,2),
  add column if not exists trendyol_sale_price numeric(10,2),
  add column if not exists trendyol_quantity int,
  add column if not exists trendyol_dimensional_weight numeric(10,2),
  add column if not exists trendyol_active boolean not null default false;

create index if not exists idx_products_trendyol_active
  on public.products (trendyol_active)
  where trendyol_active = true;

alter table public.marketplace_integrations enable row level security;
alter table public.marketplace_product_links enable row level security;
alter table public.marketplace_sync_logs enable row level security;
alter table public.marketplace_orders enable row level security;
