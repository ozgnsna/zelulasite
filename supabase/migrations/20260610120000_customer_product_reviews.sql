-- Müşteri ürün yorumları (satın alma doğrulamalı; admin onayı)

create table if not exists public.customer_product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(trim(body)) >= 10),
  reviewer_display_name text not null default 'Zelula müşterisi',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_customer_product_reviews_product_approved
  on public.customer_product_reviews (product_id, created_at desc)
  where status = 'approved';

create index if not exists idx_customer_product_reviews_user_id
  on public.customer_product_reviews (user_id);

create index if not exists idx_customer_product_reviews_status
  on public.customer_product_reviews (status, created_at desc);

alter table public.customer_product_reviews enable row level security;

drop policy if exists "product_reviews_select_approved" on public.customer_product_reviews;
create policy "product_reviews_select_approved" on public.customer_product_reviews
  for select using (status = 'approved');

drop policy if exists "product_reviews_select_own" on public.customer_product_reviews;
create policy "product_reviews_select_own" on public.customer_product_reviews
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "product_reviews_insert_own" on public.customer_product_reviews;
create policy "product_reviews_insert_own" on public.customer_product_reviews
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "product_reviews_update_own" on public.customer_product_reviews;
create policy "product_reviews_update_own" on public.customer_product_reviews
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

revoke delete on table public.customer_product_reviews from anon, authenticated;
