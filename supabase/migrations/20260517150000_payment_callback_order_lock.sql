-- Serialize QNB return callbacks per order (SELECT … FOR UPDATE).

create or replace function public.lock_order_for_payment_callback(p_order_id uuid)
returns table (
  id uuid,
  payment_status text,
  order_status text,
  payment_reference text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  select
    o.id,
    o.payment_status::text,
    o.order_status::text,
    o.payment_reference
  from public.orders o
  where o.id = p_order_id
  for update;
end;
$$;

comment on function public.lock_order_for_payment_callback(uuid) is
  'Locks order row for payment callback processing; prevents parallel duplicate QNB returns.';

revoke all on function public.lock_order_for_payment_callback(uuid) from public;
grant execute on function public.lock_order_for_payment_callback(uuid) to service_role;
