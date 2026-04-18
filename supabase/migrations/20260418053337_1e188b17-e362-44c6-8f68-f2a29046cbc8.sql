
DROP VIEW IF EXISTS public.public_property_listings;

CREATE VIEW public.public_property_listings AS
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
WHERE is_archived = false;

GRANT SELECT ON public.public_property_listings TO authenticated, anon;
