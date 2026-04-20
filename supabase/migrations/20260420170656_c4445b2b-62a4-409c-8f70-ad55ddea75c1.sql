-- Remove any prior schedule with same name, then create
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname = 'match-images-cron-every-minute' LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'match-images-cron-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/match-images-cron',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGJma25oZWJ1dHlzaGp6ZHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODQ0OTMsImV4cCI6MjA4MjQ2MDQ5M30.w7WBYorCNp3uOF1ATjXey0EHz-ng8IP7J66bol6vZXg"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);