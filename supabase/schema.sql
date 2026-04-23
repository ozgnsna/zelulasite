create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
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
  order_number text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  subtotal numeric(10,2) not null,
  total numeric(10,2) not null,
  currency text not null default 'TRY',
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  payment_provider text,
  payment_reference text,
  shipping_address_json jsonb,
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

create policy "public read products" on products for select using (is_active = true);
create policy "public read categories" on categories for select using (true);
create policy "public read collections" on collections for select using (true);
create policy "public read product_images" on product_images for select using (true);

comment on column orders.order_number is 'Critical reconciliation key visible to business operations.';
comment on column orders.payment_reference is 'Provider transaction/reference id, unique when present.';
comment on column orders.payment_status is 'Payment lifecycle state for reconciliation and finance.';
comment on column payment_logs.callback_hash is 'Callback signature/hash key used for idempotency.';
comment on column payment_logs.callback_payload is 'Raw callback payload (JSONB) stored for audits.';
comment on column payment_logs.verification_status is 'Signature verification result for callback.';
