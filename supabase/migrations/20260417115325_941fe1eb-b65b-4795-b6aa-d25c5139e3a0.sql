-- Add a broad SELECT policy on properties so the public_property_listings view
-- (security_invoker = on) returns rows for any authenticated user when the
-- property is active (not archived, not paused).
-- Tenants/vendors must still query via the view to avoid exposing financial columns.
DROP POLICY IF EXISTS "Authenticated users can browse active properties" ON public.properties;

CREATE POLICY "Authenticated users can browse active properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  is_archived = false
  AND (is_paused = false OR is_paused IS NULL)
);

-- Recreate public_property_listings to guarantee it filters only by status
-- and never references landlord_id or auth.uid(). Excludes financial columns.
DROP VIEW IF EXISTS public.public_property_listings;

CREATE VIEW public.public_property_listings
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
  created_at
FROM public.properties
WHERE is_archived = false
  AND (is_paused = false OR is_paused IS NULL);

GRANT SELECT ON public.public_property_listings TO authenticated;