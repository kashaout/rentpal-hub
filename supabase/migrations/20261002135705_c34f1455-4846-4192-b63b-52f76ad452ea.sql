CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','confirmed') THEN
    RETURN NEW;
  END IF;
  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  -- Serialize concurrent bookings for the same property
  PERFORM pg_advisory_xact_lock(hashtext('booking_overlap:' || NEW.property_id::text));

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.property_id = NEW.property_id
      AND b.id <> NEW.id
      AND b.status IN ('pending','confirmed')
      AND NOT (COALESCE(b.is_soft_lock,false) AND b.soft_lock_expires_at IS NOT NULL AND b.soft_lock_expires_at < now())
      AND b.check_in < NEW.check_out
      AND b.check_out > NEW.check_in
  ) THEN
    RAISE EXCEPTION 'These dates are no longer available for this property';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_booking_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_booking_overlap ON public.bookings;
CREATE TRIGGER trg_prevent_booking_overlap
BEFORE INSERT OR UPDATE OF check_in, check_out, status, property_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();