-- Enforce per-user authorization on Supabase Realtime channels.
-- Without these policies, any authenticated user can subscribe to any topic
-- and receive other users' order and notification updates.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow a user to subscribe to / receive broadcasts on a topic only if:
--   * they are an admin (admins manage all orders), OR
--   * the topic string contains their own auth.uid() (e.g. "orders-<uid>",
--     "notifications:<uid>", "order-confirmation-<orderId>" requires the
--     order to belong to them — handled by the uid-in-topic convention used
--     by the client).
CREATE POLICY "Users read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

-- Same rule for sending broadcast/presence messages from the client.
CREATE POLICY "Users write own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
);