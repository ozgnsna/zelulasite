-- 2.000₺ satış tutarı + manual slug temizliği (2600 silinir; 5000 üretilmiş kart varsa pasif kalır)

insert into public.gift_card_denominations (amount, currency, label, slug, sort_order, is_active)
values (2000, 'TRY', '2000 ₺ Dijital Hediye Kartı', 'manual-2000-try', 40, true)
on conflict (slug) do update
set
  label = excluded.label,
  amount = excluded.amount,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  name,
  slug,
  short_description,
  full_description,
  price,
  sku,
  stock_quantity,
  product_kind,
  is_active,
  featured,
  new_arrival
)
select
  d.label,
  d.slug,
  'Dijital hediye kartı — kod alıcı e-postasına iletilir.',
  'Zelula dijital hediye kartı. Ödeme sonrası benzersiz kod, seçtiğiniz alıcı e-posta adresine gönderilir. Kod sepette kısmi kullanılabilir.',
  d.amount,
  upper(replace(d.slug, '-', '_')),
  9999,
  'gift_card',
  true,
  false,
  false
from public.gift_card_denominations d
where d.slug = 'manual-2000-try'
  and not exists (select 1 from public.products p where p.slug = d.slug);

update public.gift_card_denominations d
set
  product_id = p.id,
  is_active = true,
  updated_at = now()
from public.products p
where d.slug = 'manual-2000-try'
  and p.slug = d.slug
  and p.product_kind = 'gift_card';

update public.products p
set
  product_kind = 'gift_card',
  price = d.amount,
  stock_quantity = greatest(p.stock_quantity, 9999),
  is_active = true,
  name = d.label
from public.gift_card_denominations d
where p.slug = 'manual-2000-try'
  and d.slug = p.slug;

update public.products p
set category_id = c.id
from public.categories c
where c.slug = 'hediye-karti'
  and p.slug = 'manual-2000-try'
  and p.category_id is distinct from c.id;

-- manual-2600: üretilmiş kart yoksa sil
delete from public.gift_card_denominations d
where d.slug = 'manual-2600-try'
  and not exists (select 1 from public.gift_cards g where g.denomination_id = d.id);

-- manual-5000: üretilmiş kart varsa yalnızca pasif (FK)
update public.gift_card_denominations
set is_active = false, updated_at = now()
where slug = 'manual-5000-try'
  and exists (select 1 from public.gift_cards g where g.denomination_id = gift_card_denominations.id);

delete from public.gift_card_denominations d
where d.slug = 'manual-5000-try'
  and not exists (select 1 from public.gift_cards g where g.denomination_id = d.id);
