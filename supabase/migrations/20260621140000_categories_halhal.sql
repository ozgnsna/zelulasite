-- Halhal kategorisi (ürün formu + /kategori/halhal)

insert into public.categories (name, slug)
values ('Halhal', 'halhal')
on conflict (slug) do nothing;
