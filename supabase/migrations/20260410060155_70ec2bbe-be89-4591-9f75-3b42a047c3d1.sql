
-- Fix views to use SECURITY INVOKER instead of default SECURITY DEFINER
ALTER VIEW public.verified_landlords SET (security_invoker = on);
ALTER VIEW public.verified_tenants_short_term SET (security_invoker = on);
ALTER VIEW public.verified_tenants_long_term SET (security_invoker = on);
