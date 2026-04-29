
-- 1. Recreate public_property_listings view with security_invoker
ALTER VIEW public.public_property_listings SET (security_invoker = true);

-- 2. Drop duplicate verification-files admin policy on storage.objects
DROP POLICY IF EXISTS "Admins can manage verification files" ON storage.objects;

-- 3. Allow landlords to view tenant verification documents in verification-documents bucket
DROP POLICY IF EXISTS "Landlords can view tenant verification documents" ON storage.objects;
CREATE POLICY "Landlords can view tenant verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE (t.user_id)::text = (storage.foldername(objects.name))[1]
      AND p.landlord_id = auth.uid()
  )
);

-- 4. Tighten realtime channel policies — exact topic matches instead of LIKE wildcards
DROP POLICY IF EXISTS "Authenticated users can read own-scoped realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send own-scoped realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated users can read own-scoped realtime messages"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Personal user channel: exact match user:<uuid>
  realtime.topic() = 'user:' || auth.uid()::text
  -- Lease channel: exact match lease:<lease_id> for owner/tenant
  OR EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE realtime.topic() = 'lease:' || la.id::text
      AND (la.tenant_user_id = auth.uid() OR la.landlord_user_id = auth.uid())
  )
  -- Property channel: exact match property:<property_id> for landlord
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE realtime.topic() = 'property:' || p.id::text
      AND p.landlord_id = auth.uid()
  )
  -- Property channel for active tenants
  OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE realtime.topic() = 'property:' || t.property_id::text
      AND t.user_id = auth.uid()
      AND t.is_archived = false
  )
);

CREATE POLICY "Authenticated users can send own-scoped realtime messages"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'user:' || auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE realtime.topic() = 'lease:' || la.id::text
      AND (la.tenant_user_id = auth.uid() OR la.landlord_user_id = auth.uid())
  )
);

-- 5. Revoke EXECUTE from anon and public on internal trigger functions and admin RPCs
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_profile_role_assignment() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_log_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_role_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_property_on_payment() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_booking_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_lease_property_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_tenant_lease_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_subscription_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_pause_property_on_safety_flag() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_create_booking_document() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_create_lease_document() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unlock_property_on_tenant_archive() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_expired_bookings() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_soft_locks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_dispatch_work_order(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_verification(uuid, boolean, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_compensation(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_initial_role(public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sign_lease_as_tenant(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_lease_credentials(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_maintenance_users() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_property_listings(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_tenant_maintenance_view() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_landlord_maintenance_view() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_landlord_of_property(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tenant_of_property(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_consultant_for_property(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_verified_landlord(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_verified_tenant(uuid) FROM anon, PUBLIC;
