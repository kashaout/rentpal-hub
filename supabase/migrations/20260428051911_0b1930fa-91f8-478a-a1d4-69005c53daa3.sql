-- Auto-assign user_roles based on profiles.ux_role
-- Note: profiles uses `ux_role` (text) and `user_id` (uuid) — not `role`/`id`.
-- The trigger fires on INSERT and on UPDATE of ux_role, so it works whether
-- the role is set at profile creation time or later via the onboarding wizard.

CREATE OR REPLACE FUNCTION public.handle_profile_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ux_role IS NOT NULL AND NEW.ux_role IN ('landlord', 'tenant') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.ux_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT OR UPDATE OF ux_role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_role_assignment();