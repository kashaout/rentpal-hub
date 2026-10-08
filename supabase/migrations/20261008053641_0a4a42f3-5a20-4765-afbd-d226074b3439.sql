-- 1. active_tenants: stop running as view owner; respect lease RLS; no anonymous reads
ALTER VIEW public.active_tenants SET (security_invoker = true);
REVOKE ALL ON public.active_tenants FROM anon;
GRANT SELECT ON public.active_tenants TO authenticated;

-- 2. log_security_event: callers can no longer log events under another user's id
CREATE OR REPLACE FUNCTION public.log_security_event(_user_id uuid, _table_name text, _action text, _event_type text DEFAULT 'rls_denial'::text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;
  INSERT INTO public.security_events (user_id, table_name, action, event_type, details)
  VALUES (auth.uid(), left(_table_name, 100), left(_action, 100), left(_event_type, 100), _details);
END;
$$;

-- 3. Trigger-only functions should not be directly executable by API roles
REVOKE EXECUTE ON FUNCTION public.dispatch_new_maintenance_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_lease_lifecycle() FROM PUBLIC, anon, authenticated;