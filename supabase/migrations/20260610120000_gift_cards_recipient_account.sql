-- Manuel / barter kuponları: hesap sahibi ile eşleştirme ve hesapta kod gösterimi
alter table public.gift_cards
  add column if not exists recipient_user_id uuid references auth.users (id) on delete set null;

alter table public.gift_cards
  add column if not exists account_visible_code text;

comment on column public.gift_cards.recipient_user_id is 'Kupon sahibi kullanıcı (manuel / barter tanımlarında).';
comment on column public.gift_cards.account_visible_code is 'Yalnızca admin/manuel tanımlarda; hesabım ekranında gösterilir.';

create index if not exists idx_gift_cards_recipient_user_id
  on public.gift_cards (recipient_user_id)
  where recipient_user_id is not null;
