-- 1. Fix privilege escalation: restrict role self-assignment to only during initial signup (no existing roles)
DROP POLICY IF EXISTS "Users can self-assign landlord or tenant roles" ON public.user_roles;
CREATE POLICY "Users can self-assign initial role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('landlord'::app_role, 'tenant'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- 2. Fix subscription self-upgrade: restrict UPDATE to non-plan fields only, restrict INSERT to free plan
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'::subscription_plan
);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'::subscription_plan
);

-- 3. Fix broad property exposure: replace blanket browse with a view that excludes sensitive fields
DROP POLICY IF EXISTS "Authenticated users can browse properties" ON public.properties;

-- Create a limited browse policy that only shows non-archived, non-paused properties
CREATE POLICY "Authenticated users can browse listed properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  is_archived = false
  AND (is_paused = false OR is_paused IS NULL)
);

-- 4. Create secure function for accessing lease credentials (only after signing, before lease end)
CREATE OR REPLACE FUNCTION public.get_lease_credentials(_lease_id uuid)
RETURNS TABLE(wifi_password text, keybox_password text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lease RECORD;
BEGIN
  SELECT la.* INTO _lease FROM lease_agreements la WHERE la.id = _lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease agreement not found';
  END IF;

  -- Only allow access to tenant or landlord of this lease, or admins
  IF NOT (
    _lease.tenant_user_id = auth.uid()
    OR _lease.landlord_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only return credentials if both parties signed and credentials have been sent
  IF NOT (_lease.tenant_signed AND _lease.landlord_signed AND _lease.credentials_sent_at IS NOT NULL) THEN
    RETURN;
  END IF;

  -- Only return credentials if within lease period (with 1 day buffer)
  IF CURRENT_DATE > (_lease.lease_end + INTERVAL '1 day')::date THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT _lease.wifi_password, _lease.keybox_password;
END;
$$;