
-- Production hardening: indexes + safe uniqueness. FKs already exist.

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_payments_lease_id     ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id  ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status       ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id   ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_property ON public.tenants(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id      ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id2 ON public.bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_property     ON public.lease_agreements(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_tenant_user  ON public.lease_agreements(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_landlord_user ON public.lease_agreements(landlord_user_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_status       ON public.lease_agreements(status);

-- Duplicate-prevention: one active tenant bridge per (user, property)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_active_user_property
  ON public.tenants(user_id, property_id)
  WHERE is_archived = false;

-- Duplicate-prevention: one payment row per lease (lifecycle-generated)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_per_lease
  ON public.payments(lease_id)
  WHERE lease_id IS NOT NULL;
