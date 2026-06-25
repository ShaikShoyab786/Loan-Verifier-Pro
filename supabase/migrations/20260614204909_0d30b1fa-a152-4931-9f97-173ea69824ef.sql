
-- Fix mutable search_path on helpers
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.assign_case_number() SET search_path = public;

-- Restrict SECURITY DEFINER functions: revoke from anon/authenticated/public,
-- keep usable by triggers and RLS via service_role + postgres.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must remain callable by authenticated (used in RLS policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
