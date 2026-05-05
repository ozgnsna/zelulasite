-- Sipariş yasal anlık görüntüsü (jsonb) ve KVKK onay zamanı

alter table public.orders
  add column if not exists legal_contract_snapshot jsonb;

alter table public.orders
  add column if not exists kvkk_consent boolean not null default false;

alter table public.orders
  add column if not exists kvkk_consent_at timestamptz;

comment on column public.orders.legal_contract_snapshot is 'Checkout anında kabul edilen sözleşme metinleri (sürüm + tam metin).';
comment on column public.orders.kvkk_consent is 'Gizlilik politikası / kişisel veri işleme onayı.';
comment on column public.orders.kvkk_consent_at is 'KVKK/gizlilik onayının zaman damgası.';
