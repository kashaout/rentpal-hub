DROP VIEW IF EXISTS public.admin_all_properties;
CREATE VIEW public.admin_all_properties 
WITH (security_invoker = true) 
AS SELECT * FROM public.properties;
GRANT SELECT ON public.admin_all_properties TO authenticated;