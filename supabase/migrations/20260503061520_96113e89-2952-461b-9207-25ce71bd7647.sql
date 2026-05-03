
-- Identity columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS government_id_number text,
  ADD COLUMN IF NOT EXISTS id_photo_path text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS identity_complete boolean NOT NULL DEFAULT false;

-- Admin: list all properties bypassing RLS
CREATE OR REPLACE FUNCTION public.rpc_admin_all_properties()
RETURNS SETOF public.properties
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.properties ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_all_properties() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_all_properties() TO authenticated;

-- Admin: summary for landlord delete confirmation
CREATE OR REPLACE FUNCTION public.rpc_admin_landlord_delete_summary(_landlord_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  active_leases int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO active_leases
    FROM lease_agreements la
    WHERE la.landlord_user_id = _landlord_id
      AND la.tenant_signed = true AND la.landlord_signed = true
      AND la.lease_end >= CURRENT_DATE;

  v := jsonb_build_object(
    'properties', (SELECT COUNT(*) FROM properties WHERE landlord_id = _landlord_id),
    'leases', (SELECT COUNT(*) FROM lease_agreements WHERE landlord_user_id = _landlord_id),
    'active_leases', active_leases,
    'bookings', (SELECT COUNT(*) FROM bookings b JOIN properties p ON p.id=b.property_id WHERE p.landlord_id = _landlord_id),
    'documents', (SELECT COUNT(*) FROM documents d JOIN properties p ON p.id=d.property_id WHERE p.landlord_id = _landlord_id),
    'maintenance_requests', (SELECT COUNT(*) FROM maintenance_requests mr JOIN properties p ON p.id=mr.property_id WHERE p.landlord_id = _landlord_id),
    'pricing_rules', (SELECT COUNT(*) FROM pricing_rules WHERE landlord_id = _landlord_id),
    'can_delete', (active_leases = 0)
  );
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_landlord_delete_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_landlord_delete_summary(uuid) TO authenticated;

-- Admin: cascade delete landlord (DB side); auth user deletion handled by edge fn
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_landlord(_landlord_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_leases int;
  property_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO active_leases
    FROM lease_agreements la
    WHERE la.landlord_user_id = _landlord_id
      AND la.tenant_signed = true AND la.landlord_signed = true
      AND la.lease_end >= CURRENT_DATE;

  IF active_leases > 0 THEN
    RAISE EXCEPTION 'Cannot delete landlord with % active lease(s). Terminate leases first.', active_leases;
  END IF;

  SELECT ARRAY(SELECT id FROM properties WHERE landlord_id = _landlord_id) INTO property_ids;

  -- Cascade in safe order
  DELETE FROM pricing_rules WHERE landlord_id = _landlord_id;
  DELETE FROM bookings WHERE property_id = ANY(property_ids);
  DELETE FROM lease_agreements WHERE landlord_user_id = _landlord_id;
  DELETE FROM maintenance_requests WHERE property_id = ANY(property_ids);
  DELETE FROM documents WHERE property_id = ANY(property_ids) OR uploaded_by = _landlord_id;
  DELETE FROM compliance_alerts WHERE property_id = ANY(property_ids);
  DELETE FROM compliance_items WHERE property_id = ANY(property_ids);
  DELETE FROM consultant_assignments WHERE property_id = ANY(property_ids);
  DELETE FROM landlord_notifications WHERE landlord_user_id = _landlord_id;
  DELETE FROM properties WHERE landlord_id = _landlord_id;
  DELETE FROM user_roles WHERE user_id = _landlord_id;
  DELETE FROM profiles WHERE user_id = _landlord_id;

  RETURN jsonb_build_object(
    'success', true,
    'landlord_id', _landlord_id,
    'property_ids', to_jsonb(property_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_delete_landlord(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_landlord(uuid) TO authenticated;

-- Identity documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Owner can manage own folder (path: <user_id>/...)
CREATE POLICY "Users can upload own identity docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own identity docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'identity-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update own identity docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own identity docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
