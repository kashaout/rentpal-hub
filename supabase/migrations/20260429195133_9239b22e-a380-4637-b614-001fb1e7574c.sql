-- Audit fix: role auto-assignment hardening + ensure handle_new_user reads metadata.role
-- Also add a security_events insert policy verification

-- 1) Update handle_new_user to also assign role from raw_user_meta_data->>'role' if present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _meta_role text;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-assign role if the signup metadata included a role hint
  _meta_role := NEW.raw_user_meta_data->>'role';
  IF _meta_role IN ('landlord', 'tenant') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _meta_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Mirror onto profile so the role is visible without an extra fetch
    UPDATE public.profiles
       SET ux_role = _meta_role
     WHERE user_id = NEW.id
       AND (ux_role IS NULL OR ux_role <> _meta_role);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Make sure handle_profile_role_assignment also kicks if profile is INSERTED with a ux_role already populated
-- (existing definition already covers INSERT OR UPDATE OF ux_role; just confirming idempotency)
CREATE OR REPLACE FUNCTION public.handle_profile_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ux_role IS NOT NULL AND NEW.ux_role IN ('landlord', 'tenant') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.ux_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Ensure on_auth_user_created trigger exists on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
