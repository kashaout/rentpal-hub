
-- 1) Create safe public_property_listings view (no financial data)
CREATE OR REPLACE VIEW public.public_property_listings AS
SELECT
  id,
  name,
  address,
  description,
  image_url,
  property_type,
  listing_type,
  units,
  region,
  amenities,
  monthly_rent,
  currency
FROM public.properties
WHERE is_archived = false
  AND (is_paused = false OR is_paused IS NULL);

-- 2) Fix maintenance tenant access - drop global policy, add scoped one
DROP POLICY IF EXISTS "Maintenance users can view tenants" ON public.tenants;

CREATE POLICY "Maintenance users can view assigned tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'maintenance'::app_role)
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN maintenance_requests mr ON mr.id = wo.maintenance_request_id
    WHERE mr.tenant_id = tenants.id
      AND wo.assigned_to = auth.uid()
  )
);

-- 3) Fix maintenance request INSERT - validate property_id matches tenant's property
DROP POLICY IF EXISTS "Tenants can create their own requests" ON public.maintenance_requests;

CREATE POLICY "Tenants can create their own requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = maintenance_requests.tenant_id
      AND t.user_id = auth.uid()
      AND t.property_id = maintenance_requests.property_id
  )
);

-- 4) Fix lease agreement INSERT - only landlords/admins can create
DROP POLICY IF EXISTS "Tenants can create lease agreements" ON public.lease_agreements;

CREATE POLICY "Landlords can create lease agreements"
ON public.lease_agreements
FOR INSERT
TO authenticated
WITH CHECK (
  landlord_user_id = auth.uid()
  AND is_landlord_of_property(auth.uid(), property_id)
);

-- Trigger to prevent property_id changes on lease agreements
CREATE OR REPLACE FUNCTION public.restrict_lease_property_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.property_id := OLD.property_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_lease_property_update ON public.lease_agreements;
CREATE TRIGGER trg_restrict_lease_property_update
BEFORE UPDATE ON public.lease_agreements
FOR EACH ROW
EXECUTE FUNCTION public.restrict_lease_property_update();

-- 5) Fix tenant-verification storage policies
-- Drop broken policies and recreate correctly
DROP POLICY IF EXISTS "Landlords can view tenant verification files" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can upload verification files" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can view their verification files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage verification files" ON storage.objects;

-- Tenants can upload their own verification files (folder = their user_id)
CREATE POLICY "Tenants can upload verification files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Tenants can view their own verification files
CREATE POLICY "Tenants can view their verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Landlords can view verification files for tenants in their properties
CREATE POLICY "Landlords can view tenant verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-verification'
  AND EXISTS (
    SELECT 1 FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.user_id::text = (storage.foldername(name))[1]
      AND p.landlord_id = auth.uid()
  )
);

-- Admins can manage all verification files
CREATE POLICY "Admins can manage verification files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'tenant-verification'
  AND has_role(auth.uid(), 'admin'::app_role)
);
