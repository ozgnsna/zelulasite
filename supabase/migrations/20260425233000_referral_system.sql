-- Zelula Davet Sistemi: referral attribution + rewards
alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists uq_profiles_referral_code
  on public.profiles (referral_code)
  where referral_code is not null;

update public.profiles
set referral_code = lower(substring(encode(gen_random_bytes(6), 'hex') for 10))
where referral_code is null;

alter table public.orders
  add column if not exists referrer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists referral_code text;

create index if not exists idx_orders_referrer_user_id
  on public.orders (referrer_user_id)
  where referrer_user_id is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'loyalty_points_ledger_type_check'
      and conrelid = 'public.loyalty_points_ledger'::regclass
  ) then
    alter table public.loyalty_points_ledger drop constraint loyalty_points_ledger_type_check;
  end if;
end $$;

alter table public.loyalty_points_ledger
  add constraint loyalty_points_ledger_type_check
  check (type in ('earned', 'redeemed', 'reversed', 'referral_earned'));

create unique index if not exists uq_loyalty_referral_per_order_user
  on public.loyalty_points_ledger (order_id, user_id)
  where type = 'referral_earned' and order_id is not null;
