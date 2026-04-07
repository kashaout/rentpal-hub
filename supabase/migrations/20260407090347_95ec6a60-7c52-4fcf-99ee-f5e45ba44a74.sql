
-- PART 1: Strip credentials from audit logs
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols text[];
  old_json jsonb;
  new_json jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    old_json := old_json - 'wifi_password' - 'keybox_password';
    new_json := new_json - 'wifi_password' - 'keybox_password';
    SELECT array_agg(key) INTO changed_cols
    FROM jsonb_each(new_json) n
    WHERE n.value IS DISTINCT FROM (old_json -> n.key);
  END IF;

  INSERT INTO public.audit_logs (
    table_name, record_id, action, old_data, new_data, changed_fields, user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) - 'wifi_password' - 'keybox_password' ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) - 'wifi_password' - 'keybox_password' ELSE NULL END,
    changed_cols,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- PART 2: Block non-admin role inserts (RESTRICTIVE)
CREATE POLICY "Block non-admin role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PART 3: Storage tightening
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Landlords and admins can upload property images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (has_role(auth.uid(), 'landlord'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Authorized users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'landlord'::app_role)
       OR has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'tenant'::app_role))
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- PART 4: Financial immutability
CREATE POLICY "Block non-admin escrow updates"
ON public.escrow_transactions AS RESTRICTIVE FOR UPDATE TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin escrow deletes"
ON public.escrow_transactions AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin financial deletes"
ON public.financial_transactions AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin payment deletes"
ON public.payments AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- PART 5: Validate inserts
DROP POLICY IF EXISTS "Tenants can create notifications for landlords" ON public.landlord_notifications;
CREATE POLICY "Tenants can create notifications for landlords"
ON public.landlord_notifications FOR INSERT TO authenticated
WITH CHECK (
  tenant_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM lease_agreements la
    WHERE la.tenant_user_id = auth.uid()
    AND la.landlord_user_id = landlord_notifications.landlord_user_id
    AND (landlord_notifications.property_id IS NULL OR la.property_id = landlord_notifications.property_id)
  )
);

DROP POLICY IF EXISTS "Tenants can create requests" ON public.tenant_requests;
CREATE POLICY "Tenants can create requests"
ON public.tenant_requests FOR INSERT TO authenticated
WITH CHECK (
  tenant_user_id = auth.uid()
  AND is_tenant_of_property(auth.uid(), property_id)
);

DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;
CREATE POLICY "Users can create disputes"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  filed_by = auth.uid()
  AND (is_landlord_of_property(auth.uid(), property_id) OR is_tenant_of_property(auth.uid(), property_id))
);

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = reviews.booking_id AND b.user_id = auth.uid() AND b.property_id = reviews.property_id)
    OR is_landlord_of_property(auth.uid(), property_id)
    OR is_tenant_of_property(auth.uid(), property_id)
  )
);

-- PART 6: Prevent booking reassignment
CREATE OR REPLACE FUNCTION public.restrict_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.property_id := OLD.property_id;
    NEW.user_id := OLD.user_id;
    NEW.total_price := OLD.total_price;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.restrict_booking_update();

-- PART 7: Scope maintenance users to SELECT+UPDATE only
DROP POLICY IF EXISTS "Maintenance users can manage work orders" ON public.work_orders;

CREATE POLICY "Maintenance users can view work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'maintenance'::app_role));

CREATE POLICY "Maintenance users can update work orders"
ON public.work_orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'maintenance'::app_role));
