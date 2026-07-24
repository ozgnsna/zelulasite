-- Admin-only wholesale unit cost (TRY)
alter table public.products
  add column if not exists cost_price numeric(10,2);

comment on column public.products.cost_price is 'Toptancı birim alış maliyeti (TRY). Yalnızca admin paneli.';

-- Public API rollerinin maliyet kolonunu okumasını engelle (service_role tam erişime sahip)
revoke select (cost_price) on table public.products from anon, authenticated;
