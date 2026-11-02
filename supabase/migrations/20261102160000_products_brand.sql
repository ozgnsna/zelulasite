-- Consumer / Google Merchant brand (nullable). Empty → feed treats as Zelula.
alter table public.products
  add column if not exists brand text;

comment on column public.products.brand is
  'Vitrin ve Google Merchant markası. NULL/boş = Zelula private label. Trendyol marka ID (trendyol_brand) ayrıdır.';
