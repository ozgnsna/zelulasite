-- Homepage category/collection cards: admin-manageable image urls.
alter table public.categories
  add column if not exists image_url text;

alter table public.collections
  add column if not exists image_url text;
