-- SEO URL yönlendirmeleri (301 / 308 / 410). hits sayacı yok; uygulama katmanı önbellekler.

create table if not exists public.url_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null,
  to_path text not null,
  status_code int not null default 301,
  note text,
  created_at timestamptz not null default now(),
  constraint url_redirects_from_path_key unique (from_path),
  constraint url_redirects_status_code_chk check (status_code in (301, 308, 410)),
  constraint url_redirects_paths_chk check (
    from_path like '/%'
    and to_path like '/%'
    and from_path <> to_path
  )
);

create index if not exists idx_url_redirects_from_path on public.url_redirects (from_path);

alter table public.url_redirects enable row level security;

revoke all on table public.url_redirects from anon, authenticated;
grant all on table public.url_redirects to service_role;
