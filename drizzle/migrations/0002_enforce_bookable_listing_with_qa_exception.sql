CREATE TABLE public.qa_listing_access (
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
GRANT ALL ON public.qa_listing_access TO service_role;
REVOKE ALL ON public.qa_listing_access FROM anon, authenticated;
ALTER TABLE public.qa_listing_access ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.qa_listing_access IS 'Temporary QA-only exception: lets one named account see/book one hidden listing until expires_at. Service-role only.';

CREATE OR REPLACE FUNCTION public.has_qa_listing_access(_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.qa_listing_access q
    WHERE q.user_id = auth.uid() AND q.property_id = _property_id AND q.expires_at > now());
$$;
REVOKE ALL ON FUNCTION public.has_qa_listing_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_qa_listing_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_bookable_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.property_id IS NOT DISTINCT FROM OLD.property_id THEN
    RETURN NEW;
  END IF;
  -- trusted backend (service role, no end-user identity)
  IF auth.uid() IS NULL AND current_user IN ('postgres','service_role','supabase_admin') THEN
    RETURN NEW;
  END IF;
  SELECT id, landlord_id, is_public, is_archived, is_paused INTO p FROM public.properties WHERE id = NEW.property_id;
  IF NOT FOUND OR p.is_archived THEN
    RAISE EXCEPTION 'This listing is not available for booking.';
  END IF;
  IF public.has_role(auth.uid(), 'admin') OR p.landlord_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  IF COALESCE(p.is_paused, false) THEN
    RAISE EXCEPTION 'This listing is not available for booking.';
  END IF;
  IF NOT p.is_public AND NOT public.has_qa_listing_access(p.id) THEN
    RAISE EXCEPTION 'This listing is not available for booking.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_bookable_listing() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enforce_bookable_listing
BEFORE INSERT OR UPDATE OF property_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_bookable_listing();

CREATE OR REPLACE FUNCTION public.get_public_property_listings(_property_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, name text, address text, description text, image_url text, property_type text, listing_type text, monthly_rent numeric, currency text, units integer, region text, amenities jsonb, created_at timestamptz, is_paused boolean, is_public boolean, landlord_id uuid, landlord_business_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.id, p.name, p.address, p.description, p.image_url,
         p.property_type, p.listing_type, p.monthly_rent, p.currency,
         p.units, p.region, p.amenities, p.created_at,
         p.is_paused, p.is_public, p.landlord_id,
         pr.business_name AS landlord_business_name
  FROM public.properties p
  LEFT JOIN public.profiles pr ON pr.user_id = p.landlord_id
  WHERE p.is_archived = false
    AND (p.is_public = true OR public.has_qa_listing_access(p.id))
    AND (_property_id IS NULL OR p.id = _property_id);
$function$;