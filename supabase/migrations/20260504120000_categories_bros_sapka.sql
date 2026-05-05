-- Üst kategori ilişkisi (opsiyonel); nav ağacı uygulama tarafında da tanımlı
alter table categories add column if not exists parent_id uuid references categories(id) on delete set null;

-- Nav için broş / şapka kategorileri (slug URL uyumlu)
insert into categories (name, slug)
values ('Broş', 'bros'), ('Şapka', 'sapka')
on conflict (slug) do nothing;
