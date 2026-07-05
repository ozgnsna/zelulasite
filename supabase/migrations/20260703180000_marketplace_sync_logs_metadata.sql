-- marketplace_sync_logs.metadata: Trendyol sync logları için yapılandırılmış ek alanlar.
-- Production'da 20260426240000 uygulanmadıysa bu migration idempotent olarak kolonu ekler.

alter table public.marketplace_sync_logs
  add column if not exists metadata jsonb;

comment on column public.marketplace_sync_logs.metadata is 'Yapılandırılmış log ekleri (ör. cron ran_at, batch parse özeti).';
