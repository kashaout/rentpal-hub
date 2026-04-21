-- Fix linter warning: views should use caller-level security
ALTER VIEW public.public_property_listings SET (security_invoker = true);

-- Safe property listing function used by tenant browsing UI
CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  description text,
  image_url text,
  property_type text,
  listing_type text,
  monthly_rent numeric,
  currency text,
  units integer,
  region text,
  amenities jsonb,
  is_paused boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
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
    COALESCE(p.is_paused, false) AS is_paused
  FROM public.properties p
  WHERE p.is_archived = false
    AND (p.is_paused = false OR p.is_paused IS NULL)
    AND (_property_id IS NULL OR p.id = _property_id)
  ORDER BY p.name ASC;
END;
$$;