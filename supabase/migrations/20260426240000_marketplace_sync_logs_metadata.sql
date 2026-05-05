-- Optional structured fields for sync logs (e.g. parsed Trendyol batch line items).
alter table public.marketplace_sync_logs
  add column if not exists metadata jsonb;
