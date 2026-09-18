CREATE OR REPLACE FUNCTION public.notify_owner_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_anon text;
  v_secret text;
  v_short_id text;
BEGIN
  v_anon := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGJma25oZWJ1dHlzaGp6ZHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODQ0OTMsImV4cCI6MjA4MjQ2MDQ5M30.w7WBYorCNp3uOF1ATjXey0EHz-ng8IP7J66bol6vZXg';

  BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'NOTIFY_TRIGGER_SECRET' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  v_short_id := UPPER(SUBSTRING(NEW.id::text, 1, 8));

  PERFORM net.http_post(
    url := 'https://jytbfknhebutyshjzdxt.supabase.co/functions/v1/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-internal-secret', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object(
      'to', '+13065394569',
      'title', 'New order received',
      'body', 'Order #' || v_short_id || ' placed. Total: $' || to_char(round(COALESCE(NEW.total, 0), 2), 'FM999990.00') || '. Check the dashboard.'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Owner SMS alert failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_owner_new_order_sms ON public.orders;
CREATE TRIGGER trg_owner_new_order_sms
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_new_order();