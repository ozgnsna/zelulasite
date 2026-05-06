-- Sensitive table hardening:
-- - keep customer order history readable by signed-in owner (orders/order_items)
-- - block direct anon/authenticated access on internal tables
-- - add explicit deny policies where table is service-role-only

-- Ensure core customer-facing read policies exist.
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Prevent public/anonymous mutations on customer order data.
revoke insert, update, delete on table public.orders from anon, authenticated;
revoke insert, update, delete on table public.order_items from anon, authenticated;
revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;

-- Internal/service-role-only tables: no direct client access.
alter table if exists public.analytics_events enable row level security;
alter table if exists public.customers enable row level security;
alter table if exists public.addresses enable row level security;
alter table if exists public.payment_logs enable row level security;
alter table if exists public.marketplace_integrations enable row level security;
alter table if exists public.marketplace_product_links enable row level security;
alter table if exists public.marketplace_sync_logs enable row level security;
alter table if exists public.marketplace_orders enable row level security;
alter table if exists public.marketplace_category_attribute_cache enable row level security;
alter table if exists public.marketplace_category_tree_cache enable row level security;

revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.addresses from anon, authenticated;
revoke all on table public.payment_logs from anon, authenticated;
revoke all on table public.marketplace_integrations from anon, authenticated;
revoke all on table public.marketplace_product_links from anon, authenticated;
revoke all on table public.marketplace_sync_logs from anon, authenticated;
revoke all on table public.marketplace_orders from anon, authenticated;
revoke all on table public.marketplace_category_attribute_cache from anon, authenticated;
revoke all on table public.marketplace_category_tree_cache from anon, authenticated;

-- Explicit deny policies to satisfy "RLS enabled, no policy" lints for internal tables.
drop policy if exists "analytics_events_deny_client_access" on public.analytics_events;
create policy "analytics_events_deny_client_access" on public.analytics_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "customers_deny_client_access" on public.customers;
create policy "customers_deny_client_access" on public.customers
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "addresses_deny_client_access" on public.addresses;
create policy "addresses_deny_client_access" on public.addresses
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "payment_logs_deny_client_access" on public.payment_logs;
create policy "payment_logs_deny_client_access" on public.payment_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_integrations_deny_client_access" on public.marketplace_integrations;
create policy "marketplace_integrations_deny_client_access" on public.marketplace_integrations
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_product_links_deny_client_access" on public.marketplace_product_links;
create policy "marketplace_product_links_deny_client_access" on public.marketplace_product_links
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_sync_logs_deny_client_access" on public.marketplace_sync_logs;
create policy "marketplace_sync_logs_deny_client_access" on public.marketplace_sync_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_orders_deny_client_access" on public.marketplace_orders;
create policy "marketplace_orders_deny_client_access" on public.marketplace_orders
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_cat_attr_cache_deny_client_access" on public.marketplace_category_attribute_cache;
create policy "marketplace_cat_attr_cache_deny_client_access" on public.marketplace_category_attribute_cache
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "marketplace_cat_tree_cache_deny_client_access" on public.marketplace_category_tree_cache;
create policy "marketplace_cat_tree_cache_deny_client_access" on public.marketplace_category_tree_cache
  for all
  to anon, authenticated
  using (false)
  with check (false);
