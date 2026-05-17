-- Hediye kartı alıcı bilgisi checkout’ta order_items üzerinde saklanır (ödeme sonrası fulfillment).
alter table public.order_items
  add column if not exists gift_card_meta jsonb;

comment on column public.order_items.gift_card_meta is
  'Dijital hediye kartı: { denominationId, recipientEmail, recipientName?, personalMessage? }';

create index if not exists idx_order_items_gift_card_meta
  on public.order_items ((gift_card_meta is not null))
  where gift_card_meta is not null;
