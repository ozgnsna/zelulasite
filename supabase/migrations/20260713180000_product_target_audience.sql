-- Ürün hedef kitlesi: kadın / erkek / unisex (Faz 1 — Erkek hub)
alter table public.products
  add column if not exists target_audience text not null default 'kadin';

alter table public.products
  drop constraint if exists products_target_audience_check;

alter table public.products
  add constraint products_target_audience_check
  check (target_audience in ('kadin', 'erkek', 'unisex'));

create index if not exists idx_products_target_audience
  on public.products (target_audience);

-- Bilinen erkek ürünleri (bileklik + yüzük)
update public.products
set target_audience = 'erkek'
where sku in ('Zelula87', 'Zelula88', 'Zelula323', 'Zelula360', 'Zelula361')
   or name ilike '%erkek%';
