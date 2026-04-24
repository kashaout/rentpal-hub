-- Add is_public to properties (defaults to true so existing properties stay listed)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Add business_name to profiles (landlords use this to brand listings)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text;

-- Recreate the public listings view to include landlord business name and respect the is_public flag.
DROP VIEW IF EXISTS public.public_property_listings CASCADE;

CREATE VIEW public.public_property_listings AS
SELECT
  p.id,
  p.name,
  p.address,
  p.description,
  p.image_url,
  p.property_type,
  p.listing_type,
  p.monthly_rent,
  p.currency,
  p.units,
  p.region,
  p.amenities,
  p.created_at,
  p.is_paused,
  p.is_public,
  p.landlord_id,
  pr.business_name AS landlord_business_name
FROM public.properties p
LEFT JOIN public.profiles pr ON pr.user_id = p.landlord_id
WHERE p.is_archived = false
  AND p.is_public = true;

GRANT SELECT ON public.public_property_listings TO anon, authenticated;

-- Recreate the RPC (dropped by CASCADE above) with SECURITY DEFINER so unauthenticated browsing works.
CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL)
RETURNS SETOF public.public_property_listings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.public_property_listings
  WHERE (_property_id IS NULL OR id = _property_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_property_listings(uuid) TO anon, authenticated;