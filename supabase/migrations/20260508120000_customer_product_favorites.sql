-- Kullanıcı ürün favorileri (hesap + PDP / liste kalp)

create table if not exists public.customer_product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_customer_product_favorites_user_id
  on public.customer_product_favorites (user_id);

create index if not exists idx_customer_product_favorites_product_id
  on public.customer_product_favorites (product_id);

alter table public.customer_product_favorites enable row level security;

drop policy if exists "product_favorites_select_own" on public.customer_product_favorites;
create policy "product_favorites_select_own" on public.customer_product_favorites
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "product_favorites_insert_own" on public.customer_product_favorites;
create policy "product_favorites_insert_own" on public.customer_product_favorites
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "product_favorites_delete_own" on public.customer_product_favorites;
create policy "product_favorites_delete_own" on public.customer_product_favorites
  for delete using (auth.uid() is not null and user_id = auth.uid());
