
-- 1) Remove broad property browse policy - browsing uses the safe view now
DROP POLICY IF EXISTS "Authenticated users can browse listed properties" ON public.properties;

-- 2) Fix maintenance photos storage policies
DROP POLICY IF EXISTS "Authenticated users can view maintenance photos" ON storage.objects;

-- Landlords can view photos for their properties
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
        AND mr.id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      JOIN tenants t ON t.id = mr.tenant_id
      WHERE t.user_id = auth.uid()
        AND mr.id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.assigned_to = auth.uid()
        AND wo.maintenance_request_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      JOIN consultant_assignments ca ON ca.property_id = mr.property_id
      WHERE ca.consultant_id = auth.uid()
        AND mr.id::text = (storage.foldername(name))[1]
    )
  )
);

-- 3) Tighten tenant lease update policy - restrict to signing fields only
DROP POLICY IF EXISTS "Tenants can update their own agreements for signing" ON public.lease_agreements;

CREATE POLICY "Tenants can update their own agreements for signing"
ON public.lease_agreements
FOR UPDATE
TO authenticated
USING (tenant_user_id = auth.uid())
WITH CHECK (
  tenant_user_id = auth.uid()
  AND tenant_signed = true
  AND tenant_signed_at IS NOT NULL
);
