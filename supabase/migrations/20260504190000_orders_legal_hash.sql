-- Yasal anlık görüntü bütünlüğü (SHA-256 özeti)

alter table public.orders
  add column if not exists legal_contract_hash text;

comment on column public.orders.legal_contract_hash is 'legal_contract_snapshot için SHA-256 (hex); kanıt zinciri.';
