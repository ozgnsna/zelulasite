insert into public.categories (name, slug)
values ('Bilezik', 'bilezik')
on conflict (slug) do nothing;
