-- Add assigned_to column to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_maintenance_requests_assigned_to ON public.maintenance_requests(assigned_to);

-- Create function to get maintenance users (security definer to access user_roles)
CREATE OR REPLACE FUNCTION public.get_maintenance_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.user_id,
    p.email,
    p.full_name
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'maintenance'
$$;