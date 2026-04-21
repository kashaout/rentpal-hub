
DROP VIEW IF EXISTS public.maintenance_tenant_lookup;

CREATE VIEW public.maintenance_tenant_lookup 
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.property_id,
  t.unit_number,
  t.user_id
FROM public.tenants t
WHERE t.is_archived = false;
