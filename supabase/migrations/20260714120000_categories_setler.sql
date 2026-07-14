-- Setler: admin'de seçilebilir DB kategorisi + mevcut set isimli ürünleri taşı
insert into categories (name, slug)
values ('Setler', 'setler')
on conflict (slug) do nothing;

update public.products p
set category_id = c.id
from categories c
where c.slug = 'setler'
  and (
    p.name ilike '%set%'
    or p.name ilike '%takım%'
    or p.name ilike '%takim%'
  );
