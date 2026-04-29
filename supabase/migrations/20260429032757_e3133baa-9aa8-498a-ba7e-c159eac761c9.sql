-- Drop the over-broad user UPDATE policy on orders.
-- No legitimate client-side flow updates an existing order; financial/state
-- changes go through admin UI or edge functions (which use the service role).
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;