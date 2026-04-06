CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id uuid)
 RETURNS TABLE(plan subscription_plan, property_limit integer, features jsonb, is_active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.property_limit, 1),
    COALESCE(s.features, '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false, "maintenance": false, "financials": false, "reports": false, "consultants": false}'::jsonb),
    COALESCE(s.is_active, true)
  FROM public.subscriptions s
  WHERE s.user_id = _user_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'free'::subscription_plan,
      1::integer,
      '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false, "maintenance": false, "financials": false, "reports": false, "consultants": false}'::jsonb,
      true::boolean;
  END IF;
END;
$function$;