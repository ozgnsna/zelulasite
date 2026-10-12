-- Misafir yorum daveti. Ham jeton yalnızca e-postadadır; burada karması durur.
-- Anon ve authenticated erişemez. Yazma hizmet rolünden, sunucu doğrulamasından sonra olur.

alter table public.customer_product_reviews
  alter column user_id drop not null;

comment on column public.customer_product_reviews.user_id is
  'Hesaplı yorumda auth.users.id. Misafir jeton yorumunda boş.';

create unique index if not exists uq_customer_product_reviews_order_product
  on public.customer_product_reviews (order_id, product_id)
  where order_id is not null;

create table if not exists public.review_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  review_id uuid references public.customer_product_reviews (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint review_invite_tokens_token_hash_key unique (token_hash),
  constraint review_invite_tokens_order_product_key unique (order_id, product_id)
);

create index if not exists idx_review_invite_tokens_order
  on public.review_invite_tokens (order_id);

comment on table public.review_invite_tokens is
  'Sipariş + ürün başına tek yorum daveti. Süre 30 gün. Ham jeton saklanmaz.';

alter table public.review_invite_tokens enable row level security;

revoke all on table public.review_invite_tokens from anon, authenticated;
grant all on table public.review_invite_tokens to service_role;
