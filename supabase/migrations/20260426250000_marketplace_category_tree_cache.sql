-- Full Trendyol category tree (for admin search); refreshed periodically.
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
