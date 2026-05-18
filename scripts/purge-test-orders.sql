-- Tek seferlik: tüm siparişleri sil + ZLL0001 sayacı (Supabase SQL Editor).
-- Önce migration: 20260518150000_reset_order_public_number_sequence.sql

delete from public.loyalty_points_ledger where order_id is not null;
delete from public.gift_card_ledger where order_id is not null;
delete from public.payment_logs;
delete from public.orders;

select public.reset_order_public_number_sequence();
