-- Site fiyat geçmişi + 10 günlük en düşük fiyat (service_role only).

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  channel text not null default 'site',
  price numeric not null,
  compare_at_price numeric,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_product_price_history_product_recorded
  on public.product_price_history (product_id, recorded_at desc);

create index if not exists idx_product_price_history_variant_recorded
  on public.product_price_history (variant_id, recorded_at desc)
  where variant_id is not null;

alter table public.product_price_history enable row level security;

revoke all on table public.product_price_history from anon, authenticated;
grant all on table public.product_price_history to service_role;

create or replace function public.trg_products_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.product_price_history (product_id, channel, price, compare_at_price)
    values (new.id, 'site', new.price, new.compare_at_price);
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (
       new.price is distinct from old.price
       or new.compare_at_price is distinct from old.compare_at_price
     ) then
    insert into public.product_price_history (product_id, channel, price, compare_at_price)
    values (new.id, 'site', new.price, new.compare_at_price);
  end if;

  return new;
end;
$$;

drop trigger if exists products_price_history_aiud on public.products;
create trigger products_price_history_aiud
  after insert or update of price, compare_at_price on public.products
  for each row
  execute function public.trg_products_price_history();

-- Mevcut ürünlerin anlık fiyat snapshot'ı (aktif + pasif)
insert into public.product_price_history (product_id, channel, price, compare_at_price)
select id, 'site', price, compare_at_price
from public.products;

create or replace function public.lowest_site_price_last_10_days(
  p_product_id uuid,
  p_variant_id uuid default null
)
returns numeric
language sql
stable
security invoker
as $$
  select min(price)
  from public.product_price_history
  where product_id = p_product_id
    and channel = 'site'
    and recorded_at >= (now() - interval '10 days')
    and (
      (p_variant_id is null and variant_id is null)
      or variant_id = p_variant_id
    );
$$;

revoke all on function public.lowest_site_price_last_10_days(uuid, uuid) from public;
revoke execute on function public.lowest_site_price_last_10_days(uuid, uuid) from anon, authenticated;
grant execute on function public.lowest_site_price_last_10_days(uuid, uuid) to service_role;
