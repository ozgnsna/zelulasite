-- Sipariş yasal onay izi: mesafeli satış + ön bilgilendirme, sözleşme sürümü, istemci meta

alter table public.orders
  add column if not exists accept_distance_sales boolean not null default false;

alter table public.orders
  add column if not exists accept_pre_contract_info boolean not null default false;

alter table public.orders
  add column if not exists legal_accepted_at timestamptz;

alter table public.orders
  add column if not exists legal_ip text;

alter table public.orders
  add column if not exists legal_user_agent text;

alter table public.orders
  add column if not exists legal_contract_version text not null default 'v1';

comment on column public.orders.accept_distance_sales is 'Checkout sırasında mesafeli satış sözleşmesi onayı.';
comment on column public.orders.accept_pre_contract_info is 'Checkout sırasında ön bilgilendirme formu onayı.';
comment on column public.orders.legal_accepted_at is 'Yasal onayların kaydedildiği zaman (sipariş oluşturma anı).';
comment on column public.orders.legal_ip is 'Onay anında istemci IP (proxy başlıklarından türetilmiş; yoksa null).';
comment on column public.orders.legal_user_agent is 'Onay anında User-Agent.';
comment on column public.orders.legal_contract_version is 'Uygulanan sözleşme metin paketi (örn. v1).';
