-- Hediye kartı satılabilir ürünleri (denomination ↔ product bağlantısı).
-- Migration 20260517120000_gift_cards.sql sonrası çalıştırın.

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
where d.is_active = true
  and not exists (select 1 from public.products p where p.slug = d.slug);

update public.gift_card_denominations d
set product_id = p.id,
    updated_at = now()
from public.products p
where p.slug = d.slug
  and p.product_kind = 'gift_card'
  and d.product_id is distinct from p.id;

update public.products p
set product_kind = 'gift_card',
    price = d.amount,
    stock_quantity = greatest(p.stock_quantity, 9999),
    is_active = true
from public.gift_card_denominations d
where p.slug = d.slug;

-- Kapak görseli: Storage'a zelula-gift-card.svg yükleyin, ardından Admin → Hediye kartları
-- «Görseli veritabanına uygula» veya `npm run upload:gift-card-image` + senkron.
