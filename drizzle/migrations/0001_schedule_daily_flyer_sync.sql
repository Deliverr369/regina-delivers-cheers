-- Refresh the Weekly Deals store flyers once a day (13:20 UTC = 07:20 Regina).
DO $$
BEGIN
  PERFORM cron.unschedule('sync-flyers-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-flyers-daily',
  '20 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/sync-flyers',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
