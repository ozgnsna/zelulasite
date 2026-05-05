-- Zelula Puan: ledger-based loyalty (earn on paid orders, redeem at checkout)
create table if not exists public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points int not null,
  type text not null check (type in ('earned', 'redeemed', 'reversed')),
  description text,
  created_at timestamptz not null default now()
);

comment on table public.loyalty_points_ledger is 'Signed points_delta rows: earned positive, redeemed negative, reversed either sign.';
comment on column public.loyalty_points_ledger.points is 'Balance delta (TRY-based rules applied in app layer).';

create unique index if not exists uq_loyalty_earn_order_desc
  on public.loyalty_points_ledger (order_id, description)
  where type = 'earned' and order_id is not null and description is not null;

create unique index if not exists uq_loyalty_redeemed_per_order
  on public.loyalty_points_ledger (order_id)
  where type = 'redeemed';

create index if not exists idx_loyalty_ledger_user_created
  on public.loyalty_points_ledger (user_id, created_at desc);

create index if not exists idx_loyalty_ledger_order_id
  on public.loyalty_points_ledger (order_id)
  where order_id is not null;

alter table public.orders
  add column if not exists loyalty_redeem_points int not null default 0;

comment on column public.orders.loyalty_redeem_points is 'Points reserved at checkout for redemption (e.g. 100 -> 50 TL off); ledger rows created when payment is paid.';

alter table public.loyalty_points_ledger enable row level security;

drop policy if exists "loyalty_ledger_select_own" on public.loyalty_points_ledger;
create policy "loyalty_ledger_select_own" on public.loyalty_points_ledger
  for select using (auth.uid() is not null and user_id = auth.uid());
