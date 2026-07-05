
-- 1. lease_credentials: block direct table SELECT — access only via get_lease_credentials RPC
DROP POLICY IF EXISTS "Landlords can view lease credentials for their leases" ON public.lease_credentials;
DROP POLICY IF EXISTS "Tenants can view their own lease credentials" ON public.lease_credentials;

-- 2. properties: drop tenant SELECT policy (exposes financial columns); replace with safe RPC
DROP POLICY IF EXISTS "Tenants can view their property" ON public.properties;

CREATE OR REPLACE FUNCTION public.get_tenant_property_summary(_property_ids uuid[])
RETURNS TABLE(id uuid, name text, address text, image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.address, p.image_url
  FROM public.properties p
  WHERE p.id = ANY(_property_ids)
    AND public.is_tenant_of_property(auth.uid(), p.id);
$$;

REVOKE ALL ON FUNCTION public.get_tenant_property_summary(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_property_summary(uuid[]) TO authenticated;

-- 3. tenants: drop maintenance direct SELECT
DROP POLICY IF EXISTS "Maintenance users can view assigned tenants basic" ON public.tenants;

-- 4. tenants: narrow consultant ALL policy to DML-only; SELECT via new safe RPC
DROP POLICY IF EXISTS "Consultants can manage tenants in assigned properties" ON public.tenants;

CREATE POLICY "Consultants can insert tenants in assigned properties"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.is_consultant_for_property(auth.uid(), property_id));

CREATE POLICY "Consultants can update tenants in assigned properties"
ON public.tenants FOR UPDATE TO authenticated
USING (public.is_consultant_for_property(auth.uid(), property_id))
WITH CHECK (public.is_consultant_for_property(auth.uid(), property_id));

CREATE POLICY "Consultants can delete tenants in assigned properties"
ON public.tenants FOR DELETE TO authenticated
USING (public.is_consultant_for_property(auth.uid(), property_id));

CREATE OR REPLACE FUNCTION public.get_consultant_tenants(_property_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, user_id uuid, property_id uuid, unit_number text,
  lease_start date, lease_end date, tenant_type text,
  is_archived boolean, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT t.id, t.user_id, t.property_id, t.unit_number,
         t.lease_start, t.lease_end, t.tenant_type,
         t.is_archived, t.created_at
  FROM public.tenants t
  WHERE (_property_id IS NULL OR t.property_id = _property_id)
    AND public.is_consultant_for_property(auth.uid(), t.property_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_consultant_tenants(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_consultant_tenants(uuid) TO authenticated;

-- 5. Security-definer view: replace public_property_listings view with a plain function
DROP FUNCTION IF EXISTS public.get_public_property_listings(uuid);
DROP VIEW IF EXISTS public.public_property_listings CASCADE;

CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, name text, address text, description text, image_url text,
  property_type text, listing_type text, monthly_rent numeric, currency text,
  units integer, region text, amenities jsonb, created_at timestamptz,
  is_paused boolean, is_public boolean, landlord_id uuid,
  landlord_business_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.address, p.description, p.image_url,
         p.property_type, p.listing_type, p.monthly_rent, p.currency,
         p.units, p.region, p.amenities, p.created_at,
         p.is_paused, p.is_public, p.landlord_id,
         pr.business_name AS landlord_business_name
  FROM public.properties p
  LEFT JOIN public.profiles pr ON pr.user_id = p.landlord_id
  WHERE p.is_archived = false
    AND p.is_public = true
    AND (_property_id IS NULL OR p.id = _property_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_property_listings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_property_listings(uuid) TO anon, authenticated;

-- 6. verification-documents storage: consolidate duplicate policies (keep ownership check)
DROP POLICY IF EXISTS "Users can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification documents" ON storage.objects;

CREATE POLICY "Users upload own verification-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own verification-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Revoke anon EXECUTE on trigger-only functions
REVOKE EXECUTE ON FUNCTION public.activate_lease_lifecycle() FROM anon, public;
