
-- ============================================
-- FIX 1: Revoke SELECT on credential columns from authenticated role
-- Only the SECURITY DEFINER RPC get_lease_credentials can return them
-- ============================================
REVOKE SELECT (wifi_password, keybox_password) ON public.lease_agreements FROM authenticated;
REVOKE SELECT (wifi_password, keybox_password) ON public.lease_agreements FROM anon;

-- ============================================
-- FIX 2: Lock down subscriptions - remove all UPDATE for non-admins
-- ============================================
-- Drop any existing user update policies
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Ensure no UPDATE policy exists for regular users (only admin ALL policy remains)
-- The restrict_subscription_update trigger is a backup but we want NO update path at all

-- Also remove INSERT for non-free plans (already exists but reinforce)
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert free subscription only"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'::subscription_plan
);

-- Block all user UPDATEs with a RESTRICTIVE policy
DROP POLICY IF EXISTS "Block non-admin subscription updates" ON public.subscriptions;
CREATE POLICY "Block non-admin subscription updates"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block all user DELETEs
DROP POLICY IF EXISTS "Block non-admin subscription deletes" ON public.subscriptions;
CREATE POLICY "Block non-admin subscription deletes"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
