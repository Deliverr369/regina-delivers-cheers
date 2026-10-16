-- Nightly blog draft generation: runs at midnight Regina time (06:00 UTC).
-- The function writes DRAFT posts only (published = false). Nothing goes live
-- and nothing is submitted to Google until the owner approves the post in the
-- dashboard; approving re-submits the sitemap via the submit-sitemap function.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('blog-drafts-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'blog-drafts-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/generate-blog-drafts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'auto-seo-cron'
    ),
    body := jsonb_build_object('cron', true)
  )::text
  $$
);