-- Keep the public property listing view stable while enforcing it as the safe browsing surface
CREATE OR REPLACE VIEW public.public_property_listings
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  address,
  description,
  image_url,
  property_type,
  listing_type,
  monthly_rent,
  currency,
  units,
  region,
  amenities,
  created_at,
  COALESCE(is_paused, false) AS is_paused
FROM public.properties
WHERE is_archived = false
  AND (is_paused = false OR is_paused IS NULL);

-- Remove broad base-table property browsing that exposes private financial columns
DROP POLICY IF EXISTS "Authenticated users can browse active properties" ON public.properties;

-- Replace public-scoped automation policies with authenticated-scoped equivalents
DROP POLICY IF EXISTS "Users can manage their own workflows" ON public.automation_workflows;
DROP POLICY IF EXISTS "Admins can manage all workflows" ON public.automation_workflows;
DROP POLICY IF EXISTS "Block anonymous access to automation_workflows" ON public.automation_workflows;

CREATE POLICY "Users can manage their own workflows"
ON public.automation_workflows
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all workflows"
ON public.automation_workflows
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Block anonymous access to automation_workflows"
ON public.automation_workflows
FOR SELECT
TO anon
USING (false);

-- Make verification document immutability explicit for normal users
DROP POLICY IF EXISTS "No user updates to verification documents" ON storage.objects;
DROP POLICY IF EXISTS "No user deletes from verification documents" ON storage.objects;

CREATE POLICY "No user updates to verification documents"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (bucket_id = 'verification-documents' AND false)
WITH CHECK (bucket_id = 'verification-documents' AND false);

CREATE POLICY "No user deletes from verification documents"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (bucket_id = 'verification-documents' AND false);

-- Harden direct role table changes so role management remains admin-only
DROP POLICY IF EXISTS "Block non-admin role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Block non-admin role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Block non-admin role deletes" ON public.user_roles;

CREATE POLICY "Block non-admin role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Block non-admin role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Block non-admin role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));