
-- ==========================================================
-- FIX 1: Remove broad SELECT policy on properties that exposes financial columns
-- Tenants/maintenance/vendors must use public_property_listings view instead
-- ==========================================================
DROP POLICY IF EXISTS "Authenticated users can view active properties for browsing" ON public.properties;

-- ==========================================================
-- FIX 2: Restrict maintenance users' access to tenant records
-- They only need id, property_id, unit_number, user_id for lookups
-- Replace full-record policy with a restricted view approach
-- ==========================================================

-- Drop the existing broad maintenance tenant policy
DROP POLICY IF EXISTS "Maintenance users can view assigned tenants" ON public.tenants;

-- Create a restricted view for maintenance users (no financial data)
CREATE OR REPLACE VIEW public.maintenance_tenant_lookup
WITH (security_invoker = on) AS
SELECT 
  t.id,
  t.property_id,
  t.unit_number,
  t.user_id,
  t.lease_start,
  t.lease_end,
  t.is_archived
FROM public.tenants t;

-- Re-add a narrower maintenance policy that only allows viewing tenants
-- for properties where they have assigned work orders
-- (This is needed so the view can read through RLS)
CREATE POLICY "Maintenance users can view assigned tenants limited"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.property_id = tenants.property_id
      AND wo.assigned_to = auth.uid()
  )
);
