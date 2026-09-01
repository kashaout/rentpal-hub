-- 1) Vendor authorization parity on maintenance_requests.
-- The UI routes vendors through rpc_maintenance_assigned_view (SECURITY DEFINER),
-- but status updates go through the table and had NO vendor policy, so every
-- vendor status change failed. Mirror the existing maintenance-role scope exactly.
CREATE POLICY "Vendors can view assigned requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'vendor'::app_role) AND assigned_to = auth.uid());

CREATE POLICY "Vendors can update assigned requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'vendor'::app_role) AND assigned_to = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'vendor'::app_role) AND assigned_to = auth.uid());

-- 2) Drop exact-duplicate lease_agreements policies (identical predicates).
DROP POLICY IF EXISTS "Landlords can view leases on their properties" ON public.lease_agreements;
DROP POLICY IF EXISTS "Tenants can view and sign their lease agreements" ON public.lease_agreements;
DROP POLICY IF EXISTS "Tenant can sign lease only" ON public.lease_agreements;
DROP POLICY IF EXISTS "Landlord can sign lease" ON public.lease_agreements;

-- 3) Indexes backed by real query patterns observed in the audit.
-- useLandlordLifecycle: properties.eq(landlord_id).eq(is_archived,false)
CREATE INDEX IF NOT EXISTS idx_properties_landlord_active
  ON public.properties (landlord_id) WHERE is_archived = false;

-- useWorkOrders / dispatch trigger / PropertyWorkOrdersTab
CREATE INDEX IF NOT EXISTS idx_work_orders_request ON public.work_orders (maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_status ON public.work_orders (property_id, status);

-- useDocuments / PropertyDocumentsTab / TenantDocumentsTab
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents (property_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by);

-- rpc_complete_checkout + active_tenants: property occupancy resolution
CREATE INDEX IF NOT EXISTS idx_lease_agreements_active_property
  ON public.lease_agreements (property_id) WHERE checked_out_at IS NULL AND status <> 'ended';