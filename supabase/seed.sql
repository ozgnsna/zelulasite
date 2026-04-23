insert into categories (name, slug) values
('Kolye', 'kolye'),
('Küpe', 'kupe'),
('Yüzük', 'yuzuk'),
('Bileklik', 'bileklik')
on conflict (slug) do nothing;

insert into collections (name, slug, description) values
('Aura', 'aura', 'Işığı yumuşak dokunuşla buluşturan modern çizgiler'),
('Noir', 'noir', 'Gece şıklığına eşlik eden güçlü parçalar'),
('Daily Glow', 'daily-glow', 'Günlük kombinlere rafine bir ışıltı')
on conflict (slug) do nothing;

with
c as (select id, slug from categories),
cl as (select id, slug from collections)
insert into products
(name, slug, short_description, full_description, price, compare_at_price, sku, stock_quantity, featured, new_arrival, category_id, collection_id, material, color, is_active)
values
('Luna Drop Küpe', 'luna-drop-kupe', 'Günlük ışıltını tamamlayan zarif form', 'Antialerjik yapıda, gün boyu hafif kullanım için tasarlandı.', 899, 1099, 'ZL-KP-001', 38, true, true, (select id from c where slug='kupe'), (select id from cl where slug='aura'), 'Çelik üzeri premium kaplama', 'Rose Gold', true),
('Nara Halka Küpe', 'nara-halka-kupe', 'Minimal halka, modern dokunuş', 'Şehir temposuna uyumlu, zamansız bir tasarım.', 749, null, 'ZL-KP-002', 41, true, false, (select id from c where slug='kupe'), (select id from cl where slug='daily-glow'), 'Paslanmaz çelik', 'Champagne', true),
('Mira Taşlı Kolye', 'mira-tasli-kolye', 'Boyun hattını vurgulayan ince zincir', 'Katmanlı kullanım için ideal uzunluk.', 1199, 1399, 'ZL-KL-003', 24, true, true, (select id from c where slug='kolye'), (select id from cl where slug='aura'), 'Premium alaşım', 'Rose Gold', true),
('Liora Kolye', 'liora-kolye', 'Tek taş etkisiyle sade bir ifade', 'Özel gün ve günlük kombinlerde dengeli görünüm.', 999, null, 'ZL-KL-004', 18, false, true, (select id from c where slug='kolye'), (select id from cl where slug='noir'), 'Çelik', 'Gold', true),
('Eterna Yüzük', 'eterna-yuzuk', 'Zamansız yüzük formu', 'Farklı ölçülerde konforlu iç yüzey.', 1099, 1299, 'ZL-YZ-005', 30, true, false, (select id from c where slug='yuzuk'), (select id from cl where slug='aura'), 'Antialerjik alaşım', 'Silver', true),
('Nova Yüzük', 'nova-yuzuk', 'Modern çizgili minimal yüzük', 'Günlük kullanım için dayanıklı gövde.', 799, null, 'ZL-YZ-006', 27, false, true, (select id from c where slug='yuzuk'), (select id from cl where slug='daily-glow'), 'Paslanmaz çelik', 'Rose Gold', true),
('Sera Bileklik', 'sera-bileklik', 'İnce zincirli şık bileklik', 'Katmanlı takı kullanımına uygun.', 699, 899, 'ZL-BL-007', 50, true, true, (select id from c where slug='bileklik'), (select id from cl where slug='daily-glow'), 'Çelik', 'Gold', true),
('Aria Bileklik', 'aria-bileklik', 'Yumuşak parlaklıkta premium doku', 'Hafif ve konforlu günlük parça.', 759, null, 'ZL-BL-008', 45, false, false, (select id from c where slug='bileklik'), (select id from cl where slug='aura'), 'Alaşım', 'Champagne', true),
('Noir Halo Küpe', 'noir-halo-kupe', 'Akşam stiline güçlü vurgu', 'Işığı taşıyan net form.', 849, null, 'ZL-KP-009', 29, true, false, (select id from c where slug='kupe'), (select id from cl where slug='noir'), 'Çelik', 'Black Gold', true),
('Petra Kolye', 'petra-kolye', 'Editoryal görünümlü zarif hat', 'Özel kutu ile gönderim.', 1249, 1499, 'ZL-KL-010', 20, false, true, (select id from c where slug='kolye'), (select id from cl where slug='noir'), 'Premium alaşım', 'Rose Gold', true),
('Mina Yüzük', 'mina-yuzuk', 'Günlük kombinlere modern eşlik', 'İnce ve zarif profil.', 689, null, 'ZL-YZ-011', 33, false, true, (select id from c where slug='yuzuk'), (select id from cl where slug='daily-glow'), 'Çelik', 'Silver', true),
('Lume Bileklik', 'lume-bileklik', 'Yumuşak tonlarda feminen parıltı', 'Hediye kutusu ile premium sunum.', 939, 1099, 'ZL-BL-012', 26, true, true, (select id from c where slug='bileklik'), (select id from cl where slug='aura'), 'Antialerjik alaşım', 'Rose Gold', true)
on conflict (slug) do nothing;

insert into product_images (product_id, image_url, is_cover, sort_order)
select p.id, 'https://picsum.photos/seed/' || p.slug || '/1200/1200', true, 0
from products p
on conflict do nothing;
