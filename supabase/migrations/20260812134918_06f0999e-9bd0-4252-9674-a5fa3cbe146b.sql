-- 1) BOOKINGS: prevent guests from falsifying price / payment / payout fields
CREATE OR REPLACE FUNCTION public.restrict_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
  _is_landlord boolean := is_landlord_of_property(auth.uid(), OLD.property_id);
BEGIN
  IF _is_admin THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.property_id := OLD.property_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;

  IF NOT _is_landlord THEN
    NEW.total_price        := OLD.total_price;
    NEW.original_price     := OLD.original_price;
    NEW.discount_amount    := OLD.discount_amount;
    NEW.final_price        := OLD.final_price;
    NEW.pricing_rule_id    := OLD.pricing_rule_id;
    NEW.payment_status     := OLD.payment_status;
    NEW.payout_status      := OLD.payout_status;
    NEW.payout_released_at := OLD.payout_released_at;
    NEW.check_in           := OLD.check_in;
    NEW.check_out          := OLD.check_out;
    NEW.expires_at         := OLD.expires_at;
    NEW.soft_lock_expires_at := OLD.soft_lock_expires_at;
    NEW.is_soft_lock       := OLD.is_soft_lock;
    NEW.dispute_id         := OLD.dispute_id;

    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    NEW.total_price     := OLD.total_price;
    NEW.original_price  := OLD.original_price;
    NEW.discount_amount := OLD.discount_amount;
    NEW.final_price     := OLD.final_price;
    NEW.pricing_rule_id := OLD.pricing_rule_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
CREATE POLICY "Users can update their own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) LEASE_AGREEMENTS: signing may only touch the caller's own signature fields
CREATE OR REPLACE FUNCTION public.restrict_lease_signature_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR has_role(_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id               := OLD.id;
  NEW.property_id      := OLD.property_id;
  NEW.tenant_user_id   := OLD.tenant_user_id;
  NEW.landlord_user_id := OLD.landlord_user_id;
  NEW.tenant_name      := OLD.tenant_name;
  NEW.landlord_name    := OLD.landlord_name;
  NEW.unit_number      := OLD.unit_number;
  NEW.rent_amount      := OLD.rent_amount;
  NEW.currency         := OLD.currency;
  NEW.lease_start      := OLD.lease_start;
  NEW.lease_end        := OLD.lease_end;
  NEW.terms            := OLD.terms;
  NEW.created_at       := OLD.created_at;

  IF _uid = OLD.tenant_user_id AND _uid IS DISTINCT FROM OLD.landlord_user_id THEN
    NEW.landlord_signed    := OLD.landlord_signed;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
  ELSIF _uid = OLD.landlord_user_id THEN
    NEW.tenant_signed    := OLD.tenant_signed;
    NEW.tenant_signed_at := OLD.tenant_signed_at;
  END IF;

  IF OLD.tenant_signed_at IS NOT NULL THEN
    NEW.tenant_signed    := true;
    NEW.tenant_signed_at := OLD.tenant_signed_at;
  END IF;
  IF OLD.landlord_signed_at IS NOT NULL THEN
    NEW.landlord_signed    := true;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS restrict_lease_signature_update_trigger ON public.lease_agreements;
CREATE TRIGGER restrict_lease_signature_update_trigger
BEFORE UPDATE ON public.lease_agreements
FOR EACH ROW EXECUTE FUNCTION public.restrict_lease_signature_update();

-- 3) PROPERTY_SAFETY_FLAGS: maintenance/vendor must be tied to the property
DROP POLICY IF EXISTS "Maintenance can create safety flags" ON public.property_safety_flags;
CREATE POLICY "Maintenance can create safety flags"
ON public.property_safety_flags FOR INSERT TO authenticated
WITH CHECK (
  flagged_by = auth.uid()
  AND (has_role(auth.uid(), 'maintenance'::app_role) OR has_role(auth.uid(), 'vendor'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.property_id = property_safety_flags.property_id
      AND (wo.assigned_to = auth.uid() OR wo.vendor_id = auth.uid())
  )
);

-- 4) WORK_ORDERS: vendors/maintenance cannot self-approve or alter cost controls
DROP POLICY IF EXISTS "Vendors can manage assigned work orders" ON public.work_orders;

CREATE OR REPLACE FUNCTION public.restrict_work_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL
     OR has_role(_uid, 'admin'::app_role)
     OR is_landlord_of_property(_uid, OLD.property_id)
     OR is_consultant_for_property(_uid, OLD.property_id) THEN
    RETURN NEW;
  END IF;

  IF _uid = OLD.vendor_id OR _uid = OLD.assigned_to THEN
    NEW.id                     := OLD.id;
    NEW.property_id            := OLD.property_id;
    NEW.maintenance_request_id := OLD.maintenance_request_id;
    NEW.vendor_id              := OLD.vendor_id;
    NEW.assigned_to            := OLD.assigned_to;
    NEW.approval_required      := OLD.approval_required;
    NEW.approval_status        := OLD.approval_status;
    NEW.approved_by            := OLD.approved_by;
    NEW.approved_at            := OLD.approved_at;
    NEW.estimated_cost         := OLD.estimated_cost;
    NEW.priority_score         := OLD.priority_score;
    NEW.severity               := OLD.severity;
    NEW.sla_response_deadline   := OLD.sla_response_deadline;
    NEW.sla_resolution_deadline := OLD.sla_resolution_deadline;
    NEW.verified_at            := OLD.verified_at;
    NEW.closed_at              := OLD.closed_at;
    NEW.created_at             := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS restrict_work_order_update_trigger ON public.work_orders;
CREATE TRIGGER restrict_work_order_update_trigger
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.restrict_work_order_update();