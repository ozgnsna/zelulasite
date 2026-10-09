-- Hangi türevlerin gerçekten yazıldığı. Boş dizi = srcset yok, orijinal kullanılır.
alter table public.product_images
  add column if not exists derivative_widths smallint[] not null default '{}';

comment on column public.product_images.derivative_widths is
  'Üretilmiş WebP genişlikleri (400 kart, 800 PDP). srcset yalnızca bu listedeki değerlerle açılır.';
