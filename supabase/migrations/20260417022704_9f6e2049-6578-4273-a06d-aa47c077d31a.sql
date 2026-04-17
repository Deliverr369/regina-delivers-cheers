
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with same name
DO $$
BEGIN
  PERFORM cron.unschedule('process-bulk-images-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-bulk-images-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/process-bulk-images',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
