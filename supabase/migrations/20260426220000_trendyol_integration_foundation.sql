-- Trendyol marketplace integration foundation (server-side only).

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
  entity_type text not null check (entity_type in ('integration', 'product', 'inventory', 'order', 'import', 'batch')),
  entity_id text,
  action text not null,
  status text not null check (status in ('success', 'error', 'skipped', 'pending')),
  message text,
  batch_request_id text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_sync_logs_main
  on public.marketplace_sync_logs (marketplace, entity_type, created_at desc);

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
