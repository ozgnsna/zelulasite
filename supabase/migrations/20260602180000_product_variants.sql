-- Ürün varyantları (örn. yüzük ölçüsü 6-7-8). Her varyantın kendi stoğu vardır.
-- Site içi seçim ve stok düşümü varyant bazlıdır; products.stock_quantity varyant
-- stoklarının toplamı olarak güncel tutulur (Trendyol / mevcut sorgular bozulmasın).
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text,
  stock_quantity int not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists product_variants_product_label_key
  on public.product_variants (product_id, lower(label));
create index if not exists idx_product_variants_product
  on public.product_variants (product_id);

alter table public.product_variants enable row level security;

drop policy if exists "public read product_variants" on public.product_variants;
create policy "public read product_variants" on public.product_variants
  for select using (true);

-- Sipariş kalemine seçilen varyant ve anlık etiket kopyası (varyant silinse de kalır).
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label text;
