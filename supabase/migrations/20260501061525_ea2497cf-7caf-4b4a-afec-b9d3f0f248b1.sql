
ALTER TABLE public.properties
  ALTER COLUMN landlord_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.restrict_property_identity_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      NEW.name := OLD.name;
    END IF;
    IF NEW.address IS DISTINCT FROM OLD.address THEN
      NEW.address := OLD.address;
    END IF;
    IF NEW.landlord_id IS DISTINCT FROM OLD.landlord_id THEN
      NEW.landlord_id := OLD.landlord_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_property_identity_update ON public.properties;
CREATE TRIGGER trg_restrict_property_identity_update
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.restrict_property_identity_update();

CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL::uuid)
RETURNS SETOF public.public_property_listings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.public_property_listings
  WHERE (_property_id IS NULL OR id = _property_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_property_listings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_property_listings(uuid) TO authenticated, anon;
