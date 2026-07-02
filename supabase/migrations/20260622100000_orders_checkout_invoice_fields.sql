-- Checkout fatura bilgileri (bireysel / şahıs şirketi / şirket)

alter table public.orders
  add column if not exists invoice_type text not null default 'individual',
  add column if not exists invoice_full_name text,
  add column if not exists invoice_tc_identity_no text,
  add column if not exists invoice_company_name text,
  add column if not exists invoice_tax_no text,
  add column if not exists invoice_tax_office text;

comment on column public.orders.invoice_type is 'Fatura tipi: individual | sole | company';
comment on column public.orders.invoice_full_name is 'Fatura ad soyad (bireysel / şahıs şirketi)';
comment on column public.orders.invoice_tc_identity_no is 'TCKN (bireysel: boşsa 11111111111; şahıs şirketi: zorunlu)';
comment on column public.orders.invoice_company_name is 'Şirket ünvanı (kurumsal)';
comment on column public.orders.invoice_tax_no is 'VKN — 10 hane (kurumsal)';
comment on column public.orders.invoice_tax_office is 'Vergi dairesi (şahıs şirketi / kurumsal)';
