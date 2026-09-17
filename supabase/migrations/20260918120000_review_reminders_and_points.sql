-- Yorum hatırlatma + onay puanı (prod'a elle uygula)
-- Kolonlar: shipped_at, delivered_at, review_reminder_sent_at
-- Backfill YOK — null kalan eski siparişler hatırlatma adayı olmaz
-- Loyalty: review:{id} unique earn
-- Cron kilit RPC (marketplace_sync_logs)

-- ---------------------------------------------------------------------------
-- orders timestamps
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists shipped_at timestamptz;

alter table public.orders
  add column if not exists delivered_at timestamptz;

alter table public.orders
  add column if not exists review_reminder_sent_at timestamptz;

comment on column public.orders.shipped_at is 'İlk kargoya verilme zamanı (order_status=shipped).';
comment on column public.orders.delivered_at is 'Teslim edildi işaretlenme zamanı (order_status=hand_delivered).';
comment on column public.orders.review_reminder_sent_at is 'Yorum hatırlatma e-postası gönderildiğinde set edilir (sipariş başına tek).';

create index if not exists idx_orders_review_reminder_pending
  on public.orders (created_at desc)
  where payment_status = 'paid'
    and review_reminder_sent_at is null
    and order_status in ('shipped', 'hand_delivered');

-- Not: shipped_at / delivered_at backfill yok — yalnızca bundan sonraki status
-- geçişlerinde uygulama katmanı doldurur (null olanlar hatırlatma adayı olmaz).

-- marketplace_sync_logs: site cron kilidi için marketplace değeri
alter table public.marketplace_sync_logs
  drop constraint if exists marketplace_sync_logs_marketplace_check;

alter table public.marketplace_sync_logs
  add constraint marketplace_sync_logs_marketplace_check
  check (marketplace in ('trendyol', 'site'));

-- ---------------------------------------------------------------------------
-- loyalty: yorum onay puanı tekilleştirme
-- ---------------------------------------------------------------------------
create unique index if not exists uq_loyalty_earned_review_description
  on public.loyalty_points_ledger (description)
  where type = 'earned' and description like 'review:%';

-- ---------------------------------------------------------------------------
-- Cron lock RPCs (TY inbound ile aynı kalıp)
-- ---------------------------------------------------------------------------
create or replace function public.try_claim_review_reminders_cron_lock(p_ttl_minutes int default 30)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_key bigint := hashtext('review_reminders_cron_lock');
  v_existing uuid;
  v_id uuid;
  v_ttl interval;
begin
  if p_ttl_minutes is null or p_ttl_minutes < 1 then
    p_ttl_minutes := 30;
  end if;
  v_ttl := make_interval(mins => p_ttl_minutes);

  perform pg_advisory_xact_lock(v_lock_key);

  select id into v_existing
  from public.marketplace_sync_logs
  where marketplace = 'site'
    and action = 'review_reminders_cron_lock'
    and status = 'pending'
    and created_at > now() - v_ttl
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return null;
  end if;

  insert into public.marketplace_sync_logs (
    marketplace, entity_type, action, status, message, metadata
  ) values (
    'site',
    'order',
    'review_reminders_cron_lock',
    'pending',
    'review reminders cron lock claimed',
    jsonb_build_object('started_at', now())
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.release_review_reminders_cron_lock(
  p_lock_id uuid,
  p_status text default 'success',
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
  v_meta jsonb;
  v_status text;
begin
  if p_lock_id is null then
    return;
  end if;

  v_status := lower(coalesce(p_status, 'success'));
  if v_status not in ('success', 'error', 'skipped', 'pending') then
    v_status := 'error';
  end if;

  select created_at, coalesce(metadata, '{}'::jsonb)
    into v_started, v_meta
  from public.marketplace_sync_logs
  where id = p_lock_id;

  if not found then
    return;
  end if;

  update public.marketplace_sync_logs
  set
    status = v_status,
    message = coalesce(nullif(trim(p_message), ''), message),
    metadata = v_meta
      || coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'finished_at', now(),
        'duration_ms', greatest(0, floor(extract(epoch from (now() - v_started)) * 1000))::int
      )
  where id = p_lock_id;
end;
$$;

revoke all on function public.try_claim_review_reminders_cron_lock(int) from public, anon, authenticated;
revoke all on function public.release_review_reminders_cron_lock(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.try_claim_review_reminders_cron_lock(int) to service_role;
grant execute on function public.release_review_reminders_cron_lock(uuid, text, text, jsonb) to service_role;
