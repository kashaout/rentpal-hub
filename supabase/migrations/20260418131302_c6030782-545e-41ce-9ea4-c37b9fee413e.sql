
-- 1) Landlord SELECT policy on lease_agreements
CREATE POLICY "Landlords can view their lease agreements"
ON public.lease_agreements
FOR SELECT
TO authenticated
USING (landlord_user_id = auth.uid());

-- 2) Realtime channel authorization — restrict subscriptions on realtime.messages
-- Only allow authenticated users to subscribe to topics that correspond to a lease
-- where they are either the tenant or landlord. Topic format used by the app:
--   "active-tenant-<user_id>"  (per src/hooks/useActiveTenant.ts)
-- We additionally allow generic per-user topics that contain auth.uid() in the topic name.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may only receive broadcast/presence/postgres_changes for topics
-- that include their own user id, OR for lease-scoped topics where they are a party.
CREATE POLICY "Authenticated users can read own-scoped realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Topic explicitly scoped to the user (e.g. active-tenant-<uid>, user-<uid>, etc.)
  (realtime.topic() LIKE '%' || auth.uid()::text || '%')
  OR
  -- Lease-scoped topics: topic contains a lease id the user is a party to
  EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE realtime.topic() LIKE '%' || la.id::text || '%'
      AND (la.tenant_user_id = auth.uid() OR la.landlord_user_id = auth.uid())
  )
  OR
  -- Property-scoped topics: topic contains a property id the user owns or rents
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE realtime.topic() LIKE '%' || p.id::text || '%'
      AND p.landlord_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE realtime.topic() LIKE '%' || t.property_id::text || '%'
      AND t.user_id = auth.uid()
      AND t.is_archived = false
  )
);

-- Allow authenticated users to send broadcast/presence messages on the same scoped topics
CREATE POLICY "Authenticated users can send own-scoped realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE '%' || auth.uid()::text || '%')
  OR
  EXISTS (
    SELECT 1 FROM public.lease_agreements la
    WHERE realtime.topic() LIKE '%' || la.id::text || '%'
      AND (la.tenant_user_id = auth.uid() OR la.landlord_user_id = auth.uid())
  )
);
