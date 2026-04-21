-- Enable required extensions for scheduled background jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name (safe re-run)
DO $$
BEGIN
  PERFORM cron.unschedule('seo-content-auto-generate');
EXCEPTION WHEN OTHERS THEN
  -- ignore if it doesn't exist
  NULL;
END $$;

-- Schedule SEO generation every 2 minutes
SELECT cron.schedule(
  'seo-content-auto-generate',
  '*/2 * * * *',
  $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.products WHERE seo_generated_at IS NULL)
      THEN net.http_post(
        url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/generate-seo-content',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGJma25oZWJ1dHlzaGp6ZHh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg4NDQ5MywiZXhwIjoyMDgyNDYwNDkzfQ.placeholder',
          'x-cron-secret', 'auto-seo-cron'
        ),
        body := jsonb_build_object('batch_size', 10, 'cron', true)
      )::text
      ELSE 'all-done'
    END;
  $$
);