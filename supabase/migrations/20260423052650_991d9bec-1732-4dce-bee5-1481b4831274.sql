
DROP FUNCTION IF EXISTS public.get_public_property_listings(uuid);

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
