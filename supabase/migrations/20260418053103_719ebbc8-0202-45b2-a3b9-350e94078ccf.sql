
-- ─── Re-attach lifecycle triggers that were dropped ─────────────────────────

-- LEASE AGREEMENTS
DROP TRIGGER IF EXISTS trg_restrict_lease_property_update ON public.lease_agreements;
CREATE TRIGGER trg_restrict_lease_property_update
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW EXECUTE FUNCTION public.restrict_lease_property_update();

DROP TRIGGER IF EXISTS trg_restrict_tenant_lease_update ON public.lease_agreements;
CREATE TRIGGER trg_restrict_tenant_lease_update
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW EXECUTE FUNCTION public.restrict_tenant_lease_update();

DROP TRIGGER IF EXISTS trg_auto_create_lease_document ON public.lease_agreements;
CREATE TRIGGER trg_auto_create_lease_document
  AFTER UPDATE ON public.lease_agreements
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_lease_document();

DROP TRIGGER IF EXISTS trg_lease_updated_at ON public.lease_agreements;
CREATE TRIGGER trg_lease_updated_at
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BOOKINGS
DROP TRIGGER IF EXISTS trg_restrict_booking_update ON public.bookings;
CREATE TRIGGER trg_restrict_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.restrict_booking_update();

DROP TRIGGER IF EXISTS trg_auto_create_booking_document ON public.bookings;
CREATE TRIGGER trg_auto_create_booking_document
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_booking_document();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAYMENTS — updated_at
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── New: lock property availability on completed payment ──────────────────

CREATE OR REPLACE FUNCTION public.lock_property_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant RECORD;
  _booking_id uuid;
BEGIN
  -- Only act on completed payments
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Look up tenant + property
  SELECT t.user_id, t.property_id, t.lease_end
    INTO _tenant
  FROM public.tenants t
  WHERE t.id = NEW.tenant_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Mark tenant as paid
  UPDATE public.tenants
     SET payment_status = 'paid', updated_at = now()
   WHERE id = NEW.tenant_id
     AND payment_status <> 'paid';

  -- Confirm any matching pending booking for this user/property
  UPDATE public.bookings
     SET status = 'confirmed',
         payment_status = 'paid',
         updated_at = now()
   WHERE user_id = _tenant.user_id
     AND property_id = _tenant.property_id
     AND status IN ('pending')
     AND payment_status IN ('unpaid', 'pending');

  -- Pause the property listing so no one else can book it during the lease
  UPDATE public.properties
     SET is_paused = true, updated_at = now()
   WHERE id = _tenant.property_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_property_on_payment ON public.payments;
CREATE TRIGGER trg_lock_property_on_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.lock_property_on_payment();

-- ─── Re-release property when its lease/tenancy ends ──────────────────────
-- (helper for landlords: when a tenant is archived or lease_end passes, unpause)

CREATE OR REPLACE FUNCTION public.unlock_property_on_tenant_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_archived = true AND OLD.is_archived = false THEN
    -- Only unlock if no other active tenant exists for the property
    IF NOT EXISTS (
      SELECT 1 FROM public.tenants
      WHERE property_id = NEW.property_id
        AND is_archived = false
        AND id <> NEW.id
    ) THEN
      UPDATE public.properties
         SET is_paused = false, updated_at = now()
       WHERE id = NEW.property_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_property_on_tenant_archive ON public.tenants;
CREATE TRIGGER trg_unlock_property_on_tenant_archive
  AFTER UPDATE OF is_archived ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.unlock_property_on_tenant_archive();
