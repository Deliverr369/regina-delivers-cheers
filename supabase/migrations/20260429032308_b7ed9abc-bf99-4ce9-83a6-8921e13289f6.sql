DROP POLICY IF EXISTS "Users read own realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users write own realtime topics" ON realtime.messages;

CREATE POLICY "Users read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() = 'orders-' || auth.uid()::text
  OR realtime.topic() LIKE 'order-confirmation-' || auth.uid()::text || '-%'
);

CREATE POLICY "Users write own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() = 'orders-' || auth.uid()::text
  OR realtime.topic() LIKE 'order-confirmation-' || auth.uid()::text || '-%'
);