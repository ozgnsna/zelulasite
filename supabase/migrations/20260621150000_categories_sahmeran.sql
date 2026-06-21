-- Şahmeran kategorisi (ürün formu + /kategori/sahmeran)

insert into public.categories (name, slug)
values ('Şahmeran', 'sahmeran')
on conflict (slug) do nothing;
