-- Dijital hediye kartı: yüz değerleri, üretilen kartlar, kısmi kullanım defteri, checkout kilidi.

-- Satılabilir tutarlar (500 / 750 / 1000 TRY)
create table if not exists public.gift_card_denominations (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'TRY',
  label text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  image_url text,
  product_id uuid unique references public.products (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (amount, currency)
);

comment on table public.gift_card_denominations is 'Satın alınabilir hediye kartı yüz değerleri (admin yönetimi).';

-- Ürünler: fiziksel vs dijital hediye kartı
alter table public.products
  add column if not exists product_kind text not null default 'physical';

alter table public.products drop constraint if exists products_product_kind_check;
alter table public.products
  add constraint products_product_kind_check
  check (product_kind in ('physical', 'gift_card'));

create index if not exists idx_products_product_kind
  on public.products (product_kind)
  where product_kind = 'gift_card';

-- Üretilmiş kart (kod yalnızca hash; düz metin DB’de tutulmaz)
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  denomination_id uuid not null references public.gift_card_denominations (id) on delete restrict,
  code_hash text not null unique,
  code_last4 varchar(4) not null,
  initial_balance numeric(10, 2) not null check (initial_balance > 0),
  balance_remaining numeric(10, 2) not null check (balance_remaining >= 0),
  currency text not null default 'TRY',
  status text not null default 'active'
    check (status in ('active', 'depleted', 'expired', 'revoked')),
  purchase_order_id uuid references public.orders (id) on delete set null,
  purchase_order_item_id uuid references public.order_items (id) on delete set null,
  purchased_by_user_id uuid references auth.users (id) on delete set null,
  purchaser_email text,
  recipient_email text not null,
  recipient_name text,
  personal_message text,
  delivered_at timestamptz,
  delivery_attempts int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_cards_balance_lte_initial
    check (balance_remaining <= initial_balance)
);

comment on table public.gift_cards is 'Ödeme sonrası üretilen tekil hediye kartı; sepette kısmi kullanılabilir.';
comment on column public.gift_cards.code_hash is 'HMAC/SHA256(normalize(code)); düz kod saklanmaz.';

create index if not exists idx_gift_cards_status on public.gift_cards (status);
create index if not exists idx_gift_cards_recipient_email on public.gift_cards (recipient_email);
create index if not exists idx_gift_cards_purchase_order on public.gift_cards (purchase_order_id);

-- Kısmi kullanım defteri
create table if not exists public.gift_card_ledger (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  entry_type text not null
    check (entry_type in ('issue', 'redeem', 'release', 'refund', 'adjust')),
  balance_after numeric(10, 2) not null check (balance_after >= 0),
  note text,
  created_at timestamptz not null default now()
);

comment on table public.gift_card_ledger is 'Bakiye hareketleri: issue, redeem (kısmi), release, refund.';

create unique index if not exists uq_gift_card_ledger_redeem_per_order
  on public.gift_card_ledger (order_id, entry_type)
  where entry_type = 'redeem' and order_id is not null;

create index if not exists idx_gift_card_ledger_card_created
  on public.gift_card_ledger (gift_card_id, created_at desc);

-- Checkout sırasında bakiye kilidi (ödeme beklerken çift harcama önlemi)
create table if not exists public.gift_card_holds (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_held numeric(10, 2) not null check (amount_held > 0),
  status text not null default 'pending'
    check (status in ('pending', 'captured', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create unique index if not exists uq_gift_card_hold_per_order
  on public.gift_card_holds (order_id);

create index if not exists idx_gift_card_holds_card_status
  on public.gift_card_holds (gift_card_id, status);

-- Sipariş: hediye kartı indirimi
alter table public.orders
  add column if not exists gift_card_redeem_amount numeric(10, 2) not null default 0;

alter table public.orders
  add column if not exists gift_card_id uuid references public.gift_cards (id) on delete set null;

comment on column public.orders.gift_card_redeem_amount is 'Bu siparişte hediye kartından düşülen TRY tutarı.';
comment on column public.orders.gift_card_id is 'Kullanılan hediye kartı (kısmi kullanım destekli).';

-- Varsayılan yüz değerleri
insert into public.gift_card_denominations (amount, currency, label, slug, sort_order)
values
  (500, 'TRY', '500 ₺ Dijital Hediye Kartı', 'hediye-karti-500', 10),
  (750, 'TRY', '750 ₺ Dijital Hediye Kartı', 'hediye-karti-750', 20),
  (1000, 'TRY', '1000 ₺ Dijital Hediye Kartı', 'hediye-karti-1000', 30)
on conflict (slug) do nothing;

-- RLS: müşteri doğrudan kart tablosuna erişmez; kod doğrulama service role / server action
alter table public.gift_card_denominations enable row level security;
alter table public.gift_cards enable row level security;
alter table public.gift_card_ledger enable row level security;
alter table public.gift_card_holds enable row level security;

drop policy if exists "gift_card_denominations_public_read_active" on public.gift_card_denominations;
create policy "gift_card_denominations_public_read_active" on public.gift_card_denominations
  for select using (is_active = true);

-- gift_cards / ledger / holds: yalnızca service role (admin API) — ek policy yok
