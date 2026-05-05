-- Kayıtlı teslimat adresleri (hesap + checkout seçimi)

create table if not exists public.customer_saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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

create index if not exists idx_customer_saved_addresses_user_id
  on public.customer_saved_addresses (user_id);

create index if not exists idx_customer_saved_addresses_user_default
  on public.customer_saved_addresses (user_id, is_default desc);

alter table public.customer_saved_addresses enable row level security;

drop policy if exists "saved_addresses_select_own" on public.customer_saved_addresses;
create policy "saved_addresses_select_own" on public.customer_saved_addresses
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_insert_own" on public.customer_saved_addresses;
create policy "saved_addresses_insert_own" on public.customer_saved_addresses
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_update_own" on public.customer_saved_addresses;
create policy "saved_addresses_update_own" on public.customer_saved_addresses
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "saved_addresses_delete_own" on public.customer_saved_addresses;
create policy "saved_addresses_delete_own" on public.customer_saved_addresses
  for delete using (auth.uid() is not null and user_id = auth.uid());
