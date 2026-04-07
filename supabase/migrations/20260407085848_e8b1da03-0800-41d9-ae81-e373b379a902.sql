
-- Remove user UPDATE access on subscriptions entirely
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Add a trigger to prevent direct modification of payment-gated fields
CREATE OR REPLACE FUNCTION public.restrict_subscription_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role (edge functions) to modify payment-gated fields
  -- For regular users, revert all sensitive fields
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.plan := OLD.plan;
    NEW.property_limit := OLD.property_limit;
    NEW.features := OLD.features;
    NEW.is_active := OLD.is_active;
    NEW.expires_at := OLD.expires_at;
    NEW.started_at := OLD.started_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_subscription_update
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_subscription_update();
