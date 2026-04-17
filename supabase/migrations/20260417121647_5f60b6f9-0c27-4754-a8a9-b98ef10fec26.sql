-- 1) Restrict column-level access on public.properties for general browsing.
-- The "Authenticated users can browse active properties" RLS policy grants row access
-- so the public_property_listings view (security_invoker) works. To prevent direct
-- SELECT of sensitive financial columns by non-owners, revoke column privileges
-- and re-grant only safe columns to the authenticated role.
-- Owners/consultants/admins/maintenance still access full rows because Postgres
-- column ACLs are checked on direct table access; the public view is owned by
-- postgres and exposes only the safe column set, while landlord/admin/consultant
-- code paths run as authenticated but require explicit column access.
-- To preserve landlord/admin/consultant full access, we GRANT all columns to
-- authenticated EXCEPT the sensitive ones, and use a SECURITY DEFINER RPC pattern
-- is unnecessary because RLS already restricts rows. Instead, simplest: tighten
-- the broad browsing policy so it only matches when the user is NOT the owner
-- AND only via the view. Since we cannot enforce "via view only" at policy level,
-- we instead REVOKE direct SELECT on sensitive columns from authenticated and
-- expose them through a SECURITY DEFINER function for owners.
-- Pragmatic fix: drop the broad browsing policy on the base table and instead
-- recreate the view as SECURITY DEFINER (owner = postgres) so it bypasses RLS
-- but only exposes safe columns. This is the standard Supabase pattern.

-- Drop the overly broad browsing policy that exposed financial columns
DROP POLICY IF EXISTS "Authenticated users can browse active properties" ON public.properties;

-- Recreate the public listings view as SECURITY DEFINER (default, owner = postgres)
-- so it bypasses RLS on the base table but only exposes non-sensitive columns.
DROP VIEW IF EXISTS public.public_property_listings;

CREATE VIEW public.public_property_listings
WITH (security_invoker = off) AS
SELECT
  id,
  name,
  address,
  description,
  image_url,
  property_type,
  listing_type,
  monthly_rent,
  currency,
  units,
  region,
  amenities,
  created_at
FROM public.properties
WHERE is_archived = false
  AND (is_paused = false OR is_paused IS NULL);

GRANT SELECT ON public.public_property_listings TO authenticated;

-- Note: monthly_rent is included because it is the public listing price tenants
-- need to see when browsing. Truly sensitive financials (acquisition_cost,
-- current_value, annual_expenses, approval_threshold, notes) are excluded.

-- 2) Allow tenants to read their own lease credentials via RLS, scoped by
-- lease_agreements.tenant_user_id. Landlords already have access via the
-- get_lease_credentials RPC; this adds direct view access for the tenant party
-- only after both signatures and credential dispatch.
CREATE POLICY "Tenants can view their own lease credentials"
ON public.lease_credentials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE la.id = lease_credentials.lease_id
      AND la.tenant_user_id = auth.uid()
      AND la.tenant_signed = true
      AND la.landlord_signed = true
      AND la.credentials_sent_at IS NOT NULL
  )
);

-- Also allow landlords to view credentials for their own leases (parity with
-- the existing RPC, so the UI can read directly without needing the RPC).
CREATE POLICY "Landlords can view lease credentials for their leases"
ON public.lease_credentials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE la.id = lease_credentials.lease_id
      AND la.landlord_user_id = auth.uid()
  )
);
