CREATE OR REPLACE FUNCTION public.rpc_maintenance_assigned_view()
RETURNS TABLE(
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.title, m.description, m.priority, m.status,
    m.created_at, m.updated_at, m.resolved_at, m.repair_notes,
    m.photo_urls, m.assigned_to, m.rating, m.tenant_id, m.property_id,
    p.name, p.address,
    pr.full_name, pr.email
  FROM public.maintenance_requests m
  JOIN public.properties p ON p.id = m.property_id
  LEFT JOIN public.profiles pr ON pr.user_id = m.assigned_to
  WHERE m.assigned_to = auth.uid()
    AND (public.has_role(auth.uid(), 'maintenance') OR public.has_role(auth.uid(), 'vendor'))
  ORDER BY m.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.rpc_maintenance_assigned_view() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_maintenance_assigned_view() TO authenticated;