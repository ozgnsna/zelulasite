-- Yorum hatırlatma pg_cron (günde 1 kez, TR ~11:00 = UTC 08:00)
-- Önkoşul: 20260918120000_review_reminders_and_points.sql uygulandı
-- Vault secret'ları (TY ile aynı):
--   zelula_site_url, zelula_cron_secret

select cron.unschedule(jobid)
from cron.job
where jobname = 'zelula-review-reminders-daily';

select cron.schedule(
  'zelula-review-reminders-daily',
  '0 8 * * *',
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
    ) || '/api/cron/review-reminders',
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

-- Durdurmak:
--   select cron.unschedule(jobid) from cron.job where jobname = 'zelula-review-reminders-daily';
