-- Cache for Trendyol category attribute definitions (server-side fetch).
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

-- Allow logging category-related sync events
alter table public.marketplace_sync_logs drop constraint if exists marketplace_sync_logs_entity_type_check;

alter table public.marketplace_sync_logs
  add constraint marketplace_sync_logs_entity_type_check
  check (
    entity_type in (
      'integration',
      'product',
      'inventory',
      'order',
      'import',
      'batch',
      'category'
    )
  );
