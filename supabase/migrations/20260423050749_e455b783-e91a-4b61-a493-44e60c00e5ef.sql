
-- 1. Fix realtime topic pattern bypass: use equality instead of LIKE
DROP POLICY IF EXISTS "Allow authenticated users to listen to their channels" ON realtime.messages;
CREATE POLICY "Allow authenticated users to listen to their channels"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user:' || auth.uid()::text
  OR realtime.topic() = auth.uid()::text
);

-- 2. Fix profiles landlord policy: change from public to authenticated role
DROP POLICY IF EXISTS "Landlords can view tenant profiles in their properties" ON public.profiles;
CREATE POLICY "Landlords can view tenant profiles in their properties"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE t.user_id = profiles.user_id
      AND p.landlord_id = auth.uid()
  )
);

-- 3. Fix lease_credentials: restrict INSERT to landlords/admins only
CREATE POLICY "Only landlords and admins can insert lease credentials"
ON public.lease_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM lease_agreements la
    JOIN properties p ON p.id = la.property_id
    WHERE la.id = lease_credentials.lease_id
      AND p.landlord_id = auth.uid()
  )
);
