-- First-share reward flag + idempotency helpers
alter table public.profiles
  add column if not exists referral_first_share_rewarded_at timestamptz;

comment on column public.profiles.referral_first_share_rewarded_at is 'Set when first referral link share bonus (+20) is granted.';

create unique index if not exists uq_loyalty_first_share_per_user
  on public.loyalty_points_ledger (user_id)
  where type = 'earned' and description like 'FIRST_REFERRAL_SHARE:%';
