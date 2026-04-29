
-- 1. Remove lease_agreements from realtime publication (financial data shouldn't be broadcast)
ALTER PUBLICATION supabase_realtime DROP TABLE public.lease_agreements;

-- 2. Switch get_public_property_listings to SECURITY INVOKER (view already uses security_invoker)
CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF public.public_property_listings
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.public_property_listings
  WHERE (_property_id IS NULL OR id = _property_id);
$function$;

-- 3. Restrict tenant deletion of verification files once a request is submitted
-- Add restrictive policy on storage.objects for tenant-verification bucket
CREATE POLICY "Block tenant delete of submitted verification files"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  bucket_id <> 'tenant-verification'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.verification_requests vr
    WHERE vr.user_id = auth.uid()
      AND name = ANY(vr.document_paths)
  )
);

CREATE POLICY "Block tenant update of submitted verification files"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id <> 'tenant-verification'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.verification_requests vr
    WHERE vr.user_id = auth.uid()
      AND name = ANY(vr.document_paths)
  )
);
