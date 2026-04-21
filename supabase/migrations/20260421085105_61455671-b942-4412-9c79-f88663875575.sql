
-- Drop the existing overly permissive maintenance SELECT policy on tenants
DROP POLICY IF EXISTS "Maintenance users can view assigned tenants limited" ON public.tenants;

-- Create a restricted SELECT policy for maintenance users that only allows access
-- We can't do column-level RLS in Postgres, so we'll use a SECURITY DEFINER function
-- that returns only the columns maintenance users need.

-- First, drop existing view if it exists (it's referenced in types already as a view)
-- The maintenance_tenant_lookup view already exists, let's replace it with restricted columns
DROP VIEW IF EXISTS public.maintenance_tenant_lookup;

CREATE OR REPLACE VIEW public.maintenance_tenant_lookup AS
SELECT 
  t.id,
  t.property_id,
  t.unit_number,
  t.user_id
FROM public.tenants t
WHERE t.is_archived = false;

-- Re-add a maintenance SELECT policy on the base tenants table that is narrowly scoped
-- Maintenance users need base access to resolve foreign key lookups but we restrict via the view
CREATE POLICY "Maintenance users can view assigned tenants basic"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.property_id = tenants.property_id
      AND wo.assigned_to = auth.uid()
  )
);
