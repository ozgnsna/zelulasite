-- Yaprak kategori SEO metinleri. Hub / erkek / çok satanlar kod haritasında kalır.
-- seo_title tam <title> değildir; layout "%s | Zelula" şablonuna girer.

alter table public.categories
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_intro text,
  add column if not exists seo_body text;
