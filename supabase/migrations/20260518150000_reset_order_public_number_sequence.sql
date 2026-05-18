-- Admin: tüm siparişler silindikten sonra ZLL0001’den yeniden başlatmak için.

create or replace function public.reset_order_public_number_sequence()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  select setval('public.order_public_number_seq', 1, false);
$$;

comment on function public.reset_order_public_number_sequence() is
  'Sipariş numarası sırasını sıfırlar; bir sonraki next_order_public_number() ZLL0001 döner.';

revoke all on function public.reset_order_public_number_sequence() from public;
grant execute on function public.reset_order_public_number_sequence() to service_role;
