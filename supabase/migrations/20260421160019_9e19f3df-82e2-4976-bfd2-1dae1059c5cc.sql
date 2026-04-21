
-- 1) Security events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text NOT NULL,
  action text NOT NULL,
  event_type text NOT NULL DEFAULT 'rls_denial',
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No user modification
CREATE POLICY "Block all user writes to security_events"
  ON public.security_events FOR ALL TO authenticated
  USING (false);

-- Allow service-role and trigger inserts via security definer
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id uuid,
  _table_name text,
  _action text,
  _event_type text DEFAULT 'rls_denial',
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (user_id, table_name, action, event_type, details)
  VALUES (_user_id, _table_name, _action, _event_type, _details);
END;
$$;

-- 2) Audit trigger on user_roles for role escalation tracking
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event(
      auth.uid(),
      'user_roles',
      'INSERT',
      'role_escalation',
      jsonb_build_object('target_user', NEW.user_id, 'role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_security_event(
      auth.uid(),
      'user_roles',
      'UPDATE',
      'role_escalation',
      jsonb_build_object('target_user', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event(
      auth.uid(),
      'user_roles',
      'DELETE',
      'role_escalation',
      jsonb_build_object('target_user', OLD.user_id, 'role', OLD.role)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

-- 3) Tenant maintenance RPC — least privilege, no financial data
CREATE OR REPLACE FUNCTION public.rpc_tenant_maintenance_view()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  repair_notes text,
  photo_urls text[],
  property_name text,
  property_address text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    mr.id,
    mr.title,
    mr.description,
    mr.priority,
    mr.status,
    mr.created_at,
    mr.updated_at,
    mr.resolved_at,
    mr.repair_notes,
    mr.photo_urls,
    p.name AS property_name,
    p.address AS property_address
  FROM maintenance_requests mr
  JOIN tenants t ON t.id = mr.tenant_id
  JOIN properties p ON p.id = mr.property_id
  WHERE t.user_id = auth.uid()
    AND t.is_archived = false
  ORDER BY mr.created_at DESC;
END;
$$;

-- 4) Landlord maintenance RPC — scoped to owned properties
CREATE OR REPLACE FUNCTION public.rpc_landlord_maintenance_view()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  repair_notes text,
  photo_urls text[],
  assigned_to uuid,
  rating integer,
  tenant_id uuid,
  property_id uuid,
  property_name text,
  property_address text,
  assigned_user_name text,
  assigned_user_email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Admin sees all, landlord sees only owned, consultant sees assigned
  RETURN QUERY
  SELECT
    mr.id,
    mr.title,
    mr.description,
    mr.priority,
    mr.status,
    mr.created_at,
    mr.updated_at,
    mr.resolved_at,
    mr.repair_notes,
    mr.photo_urls,
    mr.assigned_to,
    mr.rating,
    mr.tenant_id,
    mr.property_id,
    p.name AS property_name,
    p.address AS property_address,
    prof.full_name AS assigned_user_name,
    prof.email AS assigned_user_email
  FROM maintenance_requests mr
  JOIN properties p ON p.id = mr.property_id
  LEFT JOIN profiles prof ON prof.user_id = mr.assigned_to
  WHERE (
    has_role(auth.uid(), 'admin'::app_role)
    OR p.landlord_id = auth.uid()
    OR is_consultant_for_property(auth.uid(), p.id)
    OR (has_role(auth.uid(), 'maintenance'::app_role) AND mr.assigned_to = auth.uid())
  )
  ORDER BY mr.created_at DESC;
END;
$$;
