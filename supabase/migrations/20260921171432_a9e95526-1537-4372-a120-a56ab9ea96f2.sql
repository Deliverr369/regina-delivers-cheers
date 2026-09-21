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
BEGIN
  -- Only run for status changes; on INSERT OLD is unassigned so guard with TG_OP
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
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