
-- 1) Remove tenant self-insert on lease_agreements
DROP POLICY IF EXISTS "Tenants can create their own lease agreement" ON public.lease_agreements;

-- 2) Tighten property-images SELECT policy: replace fragile LIKE substring with strict folder ownership
DROP POLICY IF EXISTS "Anyone can view active property images" ON storage.objects;

CREATE POLICY "Public can view property images of active listings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.landlord_id::text = (storage.foldername(name))[1]
      AND p.is_archived = false
      AND (p.is_paused = false OR p.is_paused IS NULL)
  )
);

-- 3) Harden audit_logs INSERT: block ALL roles (anon + authenticated). 
-- SECURITY DEFINER triggers run as table owner, bypassing RLS, so they remain unaffected.
DROP POLICY IF EXISTS "Block all user inserts to audit_logs" ON public.audit_logs;

CREATE POLICY "Block all client inserts to audit_logs"
ON public.audit_logs AS RESTRICTIVE FOR INSERT
TO anon, authenticated
WITH CHECK (false);
