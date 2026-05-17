-- Hediye kartı kategorisi + gift_card ürünlerinin category_id güncellemesi

insert into public.categories (name, slug)
values ('Hediye Kartı', 'hediye-karti')
on conflict (slug) do nothing;

update public.products p
set category_id = c.id
from public.categories c
where c.slug = 'hediye-karti'
  and p.product_kind = 'gift_card'
  and p.category_id is distinct from c.id;
