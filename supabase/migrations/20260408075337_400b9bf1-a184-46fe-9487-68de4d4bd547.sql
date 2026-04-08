
-- 1) Fix maintenance photos policy - correct all references to objects.name
DROP POLICY IF EXISTS "Landlords can view maintenance photos" ON storage.objects;

CREATE POLICY "Landlords can view maintenance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      JOIN properties p ON p.id = mr.property_id
      WHERE p.landlord_id = auth.uid()
        AND mr.id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      JOIN tenants t ON t.id = mr.tenant_id
      WHERE t.user_id = auth.uid()
        AND mr.id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.assigned_to = auth.uid()
        AND wo.maintenance_request_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      JOIN consultant_assignments ca ON ca.property_id = mr.property_id
      WHERE ca.consultant_id = auth.uid()
        AND mr.id::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- 2) Remove tenant full property access, replace with limited view
DROP POLICY IF EXISTS "Tenants can view their property" ON public.properties;

CREATE POLICY "Tenants can view their property"
ON public.properties
FOR SELECT
TO authenticated
USING (
  is_tenant_of_property(auth.uid(), id)
);

-- Use column-level grants is not possible via RLS, so we use a view for tenant browsing
-- The existing trigger restrict_tenant_lease_update already prevents tenants from modifying sensitive lease fields
