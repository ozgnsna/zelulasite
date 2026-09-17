-- Trendyol inbound sipariş senkronu: cron kilidi RPC + pg_cron/pg_net 10 dk tetikleyici.
-- Prod'a bu dosyayı elle uygulayın. Secret'ları Vault'a ayrı SQL ile ekleyin (dosyada secret yok).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Atomic claim / release (marketplace_sync_logs; yeni tablo yok)
-- ---------------------------------------------------------------------------

create or replace function public.try_claim_inbound_orders_cron_lock(p_ttl_minutes int default 15)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_key bigint := hashtext('inbound_orders_cron_lock');
  v_existing uuid;
  v_id uuid;
  v_ttl interval;
begin
  if p_ttl_minutes is null or p_ttl_minutes < 1 then
    p_ttl_minutes := 15;
  end if;
  v_ttl := make_interval(mins => p_ttl_minutes);

  perform pg_advisory_xact_lock(v_lock_key);

  select id into v_existing
  from public.marketplace_sync_logs
  where marketplace = 'trendyol'
    and action = 'inbound_orders_cron_lock'
    and status = 'pending'
    and created_at > now() - v_ttl
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return null;
  end if;

  insert into public.marketplace_sync_logs (
    integration_id,
    marketplace,
    entity_type,
    entity_id,
    action,
    status,
    message,
    metadata
  ) values (
    null,
    'trendyol',
    'order',
    'cron:trendyol-orders-sync',
    'inbound_orders_cron_lock',
    'pending',
    'Inbound orders cron lock claimed',
    jsonb_build_object('started_at', now(), 'ttl_minutes', p_ttl_minutes)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.release_inbound_orders_cron_lock(
  p_lock_id uuid,
  p_status text,
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

revoke all on function public.try_claim_inbound_orders_cron_lock(int) from public, anon, authenticated;
revoke all on function public.release_inbound_orders_cron_lock(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.try_claim_inbound_orders_cron_lock(int) to service_role;
grant execute on function public.release_inbound_orders_cron_lock(uuid, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- pg_cron: her 10 dk Vercel route'u çağır (Vault secret gerekir)
-- Vault (elle, bir kez — gerçek değerleri siz girin):
--   select vault.create_secret('https://www.zeluladesign.com', 'zelula_site_url');
--   select vault.create_secret('<CRON_SECRET>', 'zelula_cron_secret');
-- ---------------------------------------------------------------------------

select cron.unschedule(jobid)
from cron.job
where jobname = 'zelula-ty-orders-10m';

select cron.schedule(
  'zelula-ty-orders-10m',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := (
      select trimmed
      from (
        select rtrim(decrypted_secret, '/') as trimmed
        from vault.decrypted_secrets
        where name = 'zelula_site_url'
        limit 1
      ) s
    ) || '/api/cron/trendyol-orders-sync',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'zelula_cron_secret'
        limit 1
      )
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- Job'u durdurmak için:
--   select cron.unschedule('zelula-ty-orders-10m');
-- (Supabase bazı sürümlerde jobname ile unschedule eder; aksi halde:)
--   select cron.unschedule(jobid) from cron.job where jobname = 'zelula-ty-orders-10m';
