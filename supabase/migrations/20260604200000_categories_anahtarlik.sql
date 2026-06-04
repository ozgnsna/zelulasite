insert into public.categories (name, slug)
values ('Anahtarlık', 'anahtarlik')
on conflict (slug) do nothing;
