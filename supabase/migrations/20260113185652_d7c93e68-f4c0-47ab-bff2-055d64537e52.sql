-- Prevent privilege escalation: allow users to self-assign ONLY tenant/landlord roles on signup

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can self-assign landlord or tenant roles" ON public.user_roles;

CREATE POLICY "Users can self-assign landlord or tenant roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('landlord'::public.app_role, 'tenant'::public.app_role)
);
