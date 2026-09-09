CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meta_role text;
  _dob text;
BEGIN
  _dob := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '');

  INSERT INTO public.profiles (user_id, email, full_name, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN _dob IS NOT NULL THEN _dob::date ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF _dob IS NOT NULL THEN
    UPDATE public.profiles
       SET date_of_birth = _dob::date
     WHERE user_id = NEW.id
       AND date_of_birth IS NULL;
  END IF;

  _meta_role := NEW.raw_user_meta_data->>'role';
  IF _meta_role IN ('landlord', 'tenant') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _meta_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
       SET ux_role = _meta_role
     WHERE user_id = NEW.id
       AND (ux_role IS NULL OR ux_role <> _meta_role);
  END IF;

  RETURN NEW;
END;
$function$;