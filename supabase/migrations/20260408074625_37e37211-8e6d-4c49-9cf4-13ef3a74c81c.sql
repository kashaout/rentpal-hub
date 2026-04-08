
DROP VIEW IF EXISTS public.public_property_listings;

CREATE VIEW public.public_property_listings
WITH (security_invoker = true)
AS
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
