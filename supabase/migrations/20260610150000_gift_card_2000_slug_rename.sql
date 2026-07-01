-- manual-2000-try → hediye-karti-2000 (diğer tutarlarla aynı slug deseni)

update public.products
set
  slug = 'hediye-karti-2000',
  sku = 'HEDIYE_KARTI_2000'
where slug = 'manual-2000-try';

update public.gift_card_denominations
set
  slug = 'hediye-karti-2000',
  updated_at = now()
where slug = 'manual-2000-try';
