-- 1. Customer notifications: skip while the order is still awaiting payment,
--    and fire "Order received" when payment completes.
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  short_id TEXT;
  notif_title TEXT;
  notif_body TEXT;
  v_activated BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'awaiting_payment' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'awaiting_payment' THEN
      RETURN NEW;
    END IF;
    v_activated := OLD.payment_status = 'awaiting_payment';
    IF NOT v_activated AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;
  END IF;

  short_id := UPPER(SUBSTRING(NEW.id::text, 1, 8));

  CASE NEW.status
    WHEN 'pending' THEN
      notif_title := 'Order received';
      notif_body := 'Your order has been received. Order #' || short_id || '. Questions or updates? Call us at 306-539-4569 for immediate help.';
    WHEN 'confirmed' THEN
      notif_title := 'Order confirmed';
      notif_body := 'Your order #' || short_id || ' has been confirmed.';
    WHEN 'preparing' THEN
      notif_title := 'Shopper on your order';
      notif_body := 'A shopper is purchasing your items for order #' || short_id || '. They will call you if an item is unavailable or a replacement is needed. Questions? Call us at 306-539-4569 for immediate help.';
    WHEN 'out_for_delivery' THEN
      notif_title := 'Out for delivery';
      notif_body := 'Order #' || short_id || ' is on its way to you.';
    WHEN 'delivered' THEN
      notif_title := 'Order delivered';
      notif_body := 'Order #' || short_id || ' delivered. Thank you for using our service — hope to see you again!';
    WHEN 'cancelled' THEN
      notif_title := 'Order cancelled';
      notif_body := 'Your order #' || short_id || ' has been cancelled.';
    ELSE
      notif_title := 'Order update';
      notif_body := 'Your order #' || short_id || ' status: ' || NEW.status;
  END CASE;

  INSERT INTO public.notifications (user_id, order_id, type, title, body)
  VALUES (NEW.user_id, NEW.id, 'order_update', notif_title, notif_body);

  RETURN NEW;
END;
$$;

-- 2. Owner SMS: only once the order is actually paid for / confirmed.
CREATE OR REPLACE FUNCTION public.notify_owner_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon text;
  v_secret text;
  v_short_id text;
BEGIN
  IF NEW.payment_status = 'awaiting_payment' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM 'awaiting_payment' THEN
    RETURN NEW;
  END IF;

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
      'order_id', NEW.id,
      'kind', 'owner',
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
$$;

DROP TRIGGER IF EXISTS trg_owner_new_order_sms ON public.orders;
CREATE TRIGGER trg_owner_new_order_sms
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_owner_new_order();

-- 3. Customer-owned finalize / discard helpers for the awaiting-payment window.
CREATE OR REPLACE FUNCTION public.finalize_order_payment(_order_ids uuid[], _payment_intent_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.orders
  SET payment_status = 'authorized',
      stripe_payment_intent_id = COALESCE(_payment_intent_id, stripe_payment_intent_id),
      updated_at = now()
  WHERE id = ANY(_order_ids)
    AND user_id = auth.uid()
    AND payment_status = 'awaiting_payment';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.discard_unpaid_orders(_order_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT array_agg(id) INTO v_ids
  FROM public.orders
  WHERE id = ANY(_order_ids)
    AND user_id = auth.uid()
    AND payment_status = 'awaiting_payment';

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.order_items WHERE order_id = ANY(v_ids);
  DELETE FROM public.notifications WHERE order_id = ANY(v_ids);
  DELETE FROM public.orders WHERE id = ANY(v_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid[], text) FROM public;
REVOKE ALL ON FUNCTION public.discard_unpaid_orders(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discard_unpaid_orders(uuid[]) TO authenticated, service_role;