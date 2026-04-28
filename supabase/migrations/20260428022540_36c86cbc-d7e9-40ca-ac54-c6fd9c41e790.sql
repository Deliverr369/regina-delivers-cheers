-- Fix notify_order_status_change to use the correct enum value
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
      v_title := 'Order placed ✅';
      v_body  := 'We received your order #' || v_short_id || '. We''ll get shopping shortly!';
    WHEN 'confirmed' THEN
      v_title := 'Order confirmed 👍';
      v_body  := 'Your order #' || v_short_id || ' has been confirmed.';
    WHEN 'preparing' THEN
      v_title := 'Shopper on it 🛒';
      v_body  := 'A shopper is picking your items for order #' || v_short_id || '.';
    WHEN 'out_for_delivery' THEN
      v_title := 'Out for delivery 🚗';
      v_body  := 'Your order #' || v_short_id || ' is on the way!';
    WHEN 'delivered' THEN
      v_title := 'Delivered 🎉';
      v_body  := 'Your order #' || v_short_id || ' has been delivered. Cheers!';
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

-- Ensure trigger exists on orders for status notifications
DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- Enable realtime so customers and admins see status changes live
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END$$;