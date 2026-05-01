-- 1) Fix property-images public SELECT policy: it referenced `p.name` (the property table column)
--    instead of the storage object's path. Rebuild it to correctly correlate to the object.
DROP POLICY IF EXISTS "Public can view property images of active listings" ON storage.objects;

CREATE POLICY "Public can view property images of active listings"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE (storage.foldername(storage.objects.name))[1] = (p.landlord_id)::text
      AND p.is_archived = false
      AND (p.is_paused IS NULL OR p.is_paused = false)
  )
);

-- 2) Tighten audit_logs admin SELECT policy to {authenticated} only,
--    remove the redundant {anon} block (we already have block-all-inserts and admin-only select).
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block anonymous access to audit_logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Revoke EXECUTE from anon/public on SECURITY DEFINER trigger functions.
--    These are only meant to run as triggers, never as RPCs.
REVOKE EXECUTE ON FUNCTION public.restrict_booking_price_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_property_identity_update() FROM PUBLIC, anon, authenticated;

-- 4) user_roles: add a defensive RESTRICTIVE policy ensuring only admins can ever INSERT,
--    even if a future PERMISSIVE policy is added by mistake. (Idempotent if exists.)
DROP POLICY IF EXISTS "Restrict role inserts to admins only" ON public.user_roles;
CREATE POLICY "Restrict role inserts to admins only"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));