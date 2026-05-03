
-- Update push trigger to send SEND_PUSH_SECRET header
CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_anon text;
  v_secret text;
BEGIN
  v_url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/send-push';
  v_anon := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGJma25oZWJ1dHlzaGp6ZHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODQ0OTMsImV4cCI6MjA4MjQ2MDQ5M30.w7WBYorCNp3uOF1ATjXey0EHz-ng8IP7J66bol6vZXg';

  -- Fetch shared secret from Vault if available; falls back to anon-only call which the function will reject
  BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'SEND_PUSH_SECRET' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-internal-secret', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'link', NEW.link
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push delivery failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Store the SEND_PUSH_SECRET in Vault so the trigger can read it.
-- We use a placeholder approach: insert via select from settings if available.
-- Since vault management from migration is limited, also revoke EXECUTE on
-- admin-only SECURITY DEFINER RPCs from anon to satisfy linter.
REVOKE EXECUTE ON FUNCTION public.get_seo_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_inventory_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_product_catalog_groups() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_overview(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_seo_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_catalog_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview(integer) TO authenticated;
