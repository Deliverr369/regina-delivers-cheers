CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_body text;
  v_short_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_short_id := upper(substr(NEW.id::text, 1, 8));

  CASE NEW.status::text
    WHEN 'pending' THEN
      v_title := 'Order received ✅';
      v_body  := 'Your order has been received. Order #' || v_short_id || '.';
    WHEN 'confirmed' THEN
      v_title := 'Order confirmed 👍';
      v_body  := 'Your order #' || v_short_id || ' has been confirmed.';
    WHEN 'preparing' THEN
      v_title := 'Shopper is shopping 🛒';
      v_body  := 'A shopper is purchasing your items for order #' || v_short_id || '. They will call you if an item is unavailable or a replacement is needed.';
    WHEN 'out_for_delivery' THEN
      v_title := 'Out for delivery 🚗';
      v_body  := 'Your order #' || v_short_id || ' is on the way!';
    WHEN 'delivered' THEN
      v_title := 'Order delivered 🎉';
      v_body  := 'Order #' || v_short_id || ' delivered. Thank you for using our service — hope to see you again!';
    WHEN 'cancelled' THEN
      v_title := 'Order cancelled';
      v_body  := 'Order #' || v_short_id || ' was cancelled.';
    ELSE
      v_title := 'Order update';
      v_body  := 'Order #' || v_short_id || ' status: ' || NEW.status::text;
  END CASE;

  INSERT INTO public.notifications (user_id, order_id, type, title, body, link)
  VALUES (NEW.user_id, NEW.id, 'order_update', v_title, v_body, '/orders');

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM anon, authenticated, public;