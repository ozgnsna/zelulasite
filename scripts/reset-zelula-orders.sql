-- Zelula mağaza siparişlerini tamamen sil + kısa sipariş numarası (ZLL0001…) sırasını başa al.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyanın tamamını yapıştır → Run
-- Gerekli yetki: postgres / service_role (RLS bypass).
--
-- UYARI: Geri alınamaz. Ödeme / muhasebe / pazaryeri mutabakatı etkilenir.

begin;

-- Siparişe bağlı ödeme günlükleri (opsiyonel temizlik; ON DELETE SET NULL da bırakılabilirdi)
delete from public.payment_logs
where order_id is not null;

-- Siparişe bağlı puan defteri
delete from public.loyalty_points_ledger
where order_id is not null;

-- Sipariş kalemleri orders üzerinde ON DELETE CASCADE ile gider
delete from public.orders;

-- Sonraki sipariş numarası ZLL0001 olacak şekilde sıfırla
select setval('public.order_public_number_seq', 1, false);

commit;
