-- Admin oversight view: returns all properties regardless of archive/pause status
CREATE OR REPLACE VIEW public.admin_all_properties AS
SELECT * FROM public.properties;

-- Grant access (RLS on properties table already limits to admins)
GRANT SELECT ON public.admin_all_properties TO authenticated;