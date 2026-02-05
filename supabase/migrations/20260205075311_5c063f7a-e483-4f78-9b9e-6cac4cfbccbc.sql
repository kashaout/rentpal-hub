-- Create rate_limits table for persistent rate limiting
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_blocked_until ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable RLS but allow service role only (edge functions use service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all direct user access - only service role can access
CREATE POLICY "Block all user access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);

-- Update trigger for updated_at
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function for old entries (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE updated_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Fix get_maintenance_users to add role-based access control
DROP FUNCTION IF EXISTS public.get_maintenance_users();

CREATE OR REPLACE FUNCTION public.get_maintenance_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins, landlords, consultants can view the maintenance users list
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'landlord'::app_role) OR
    has_role(auth.uid(), 'consultant'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins, landlords, and consultants can view maintenance users';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id,
    p.email,
    p.full_name
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'maintenance';
END;
$$;