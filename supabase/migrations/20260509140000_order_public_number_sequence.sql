-- Kısa, sıralı sipariş numarası: ZLL0001, ZLL0002, … (checkout / createCheckout)

create sequence if not exists public.order_public_number_seq;

-- Zaten ZLL#### biçiminde kayıt varsa sırayı onların üstüne al
do $$
declare
  maxn bigint;
begin
  select coalesce(
    max(
      case
        when order_number ~ '^ZLL[0-9]+$' then substring(order_number from 4)::bigint
        else null::bigint
      end
    ),
    0::bigint
  )
  into maxn
  from public.orders;

  -- setval 0 kabul etmez; ZLL kaydı yoksa sıra varsayılanı (ilk nextval = 1) yeterli
  if maxn > 0 then
    perform setval('public.order_public_number_seq', maxn, true);
  end if;
end $$;

create or replace function public.next_order_public_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'ZLL' || lpad(nextval('public.order_public_number_seq')::text, 4, '0');
$$;

comment on function public.next_order_public_number() is 'Atomik sıradaki bir sonraki kısa sipariş numarası (ZLL + 4 hane).';

revoke all on function public.next_order_public_number() from public;
grant execute on function public.next_order_public_number() to service_role;
