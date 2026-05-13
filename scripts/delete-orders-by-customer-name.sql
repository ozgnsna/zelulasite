-- Belirtilen müşteri adına ait tüm siparişleri siler (ZLL sırasını değiştirmez).
--
-- Kullanım: Supabase SQL Editor — aşağıdaki isim sabitini gerekirse düzenleyin → Run
--
-- UYARI: Geri alınamaz.

begin;

with target as (
  select id
  from public.orders
  where lower(regexp_replace(trim(customer_name), '\s+', ' ', 'g'))
      = lower(regexp_replace(trim('Özgün Sena Uğur'), '\s+', ' ', 'g'))
)

delete from public.payment_logs
where order_id in (select id from target);

delete from public.loyalty_points_ledger
where order_id in (select id from target);

delete from public.orders
where id in (select id from target);

commit;
