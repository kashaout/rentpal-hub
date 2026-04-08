
-- 1) Fix is_tenant_of_property to exclude archived tenants
CREATE OR REPLACE FUNCTION public.is_tenant_of_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE user_id = _user_id
      AND property_id = _property_id
      AND is_archived = false
  )
$$;

-- 2) Fix maintenance_logs SELECT policy
DROP POLICY IF EXISTS "Users can view logs for accessible work orders" ON public.maintenance_logs;

CREATE POLICY "Users can view logs for accessible work orders"
ON public.maintenance_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = maintenance_logs.work_order_id
      AND (
        is_landlord_of_property(auth.uid(), wo.property_id)
        OR is_tenant_of_property(auth.uid(), wo.property_id)
        OR is_consultant_for_property(auth.uid(), wo.property_id)
        OR (has_role(auth.uid(), 'maintenance'::app_role) AND wo.assigned_to = auth.uid())
        OR (has_role(auth.uid(), 'vendor'::app_role) AND wo.vendor_id = auth.uid())
      )
  )
);

-- 3) Fix tenant verification landlord policy (correct objects.name reference)
DROP POLICY IF EXISTS "Landlords can view tenant verification files" ON storage.objects;

CREATE POLICY "Landlords can view tenant verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-verification'
  AND EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.user_id::text = (storage.foldername(objects.name))[1]
      AND p.landlord_id = auth.uid()
  )
);
