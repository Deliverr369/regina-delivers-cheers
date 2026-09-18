-- Trigger-only helper functions should not be callable via the API.
REVOKE EXECUTE ON FUNCTION public.notify_owner_new_order() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_send_sms() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_send_push() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_age_verified_on_order() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_order_store_id() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_single_default_address() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_store_hours() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;