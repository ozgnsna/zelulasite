-- analytics_events tablosunu public erişime kapat, sadece service role ile yaz/oku.
alter table if exists public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;

-- Gecmis kayitlarda query string birikimini temizle.
update public.analytics_events
set page_path = split_part(page_path, '?', 1)
where page_path like '%?%';
