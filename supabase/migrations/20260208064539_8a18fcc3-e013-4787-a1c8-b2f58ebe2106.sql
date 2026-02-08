-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'business');

-- Create workflow type enum  
CREATE TYPE public.workflow_type AS ENUM ('overdue_rent', 'lease_expiry', 'low_occupancy', 'compliance_expiry', 'high_maintenance');

-- Create workflow status enum
CREATE TYPE public.workflow_status AS ENUM ('active', 'paused', 'triggered', 'completed');

-- User subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  property_limit INTEGER NOT NULL DEFAULT 3,
  features JSONB NOT NULL DEFAULT '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Automation workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_type workflow_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow alerts/notifications table
CREATE TABLE public.workflow_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type workflow_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_alerts ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Block anonymous access to subscriptions" ON public.subscriptions
FOR SELECT USING (false);

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Automation workflows policies
CREATE POLICY "Block anonymous access to automation_workflows" ON public.automation_workflows
FOR SELECT USING (false);

CREATE POLICY "Users can manage their own workflows" ON public.automation_workflows
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all workflows" ON public.automation_workflows
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Workflow alerts policies
CREATE POLICY "Block anonymous access to workflow_alerts" ON public.workflow_alerts
FOR SELECT USING (false);

CREATE POLICY "Users can manage their own alerts" ON public.workflow_alerts
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all alerts" ON public.workflow_alerts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX idx_workflows_user ON public.automation_workflows(user_id);
CREATE INDEX idx_workflows_type ON public.automation_workflows(workflow_type);
CREATE INDEX idx_workflow_alerts_user ON public.workflow_alerts(user_id);
CREATE INDEX idx_workflow_alerts_read ON public.workflow_alerts(is_read);
CREATE INDEX idx_workflow_alerts_triggered ON public.workflow_alerts(triggered_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_workflows_updated_at
BEFORE UPDATE ON public.automation_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get user subscription with defaults
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id uuid)
RETURNS TABLE(
  plan subscription_plan,
  property_limit integer,
  features jsonb,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan),
    COALESCE(s.property_limit, 3),
    COALESCE(s.features, '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false}'::jsonb),
    COALESCE(s.is_active, true)
  FROM public.subscriptions s
  WHERE s.user_id = _user_id
  LIMIT 1;
  
  -- Return defaults if no subscription exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'free'::subscription_plan,
      3::integer,
      '{"compliance_tracker": false, "automation_workflows": false, "advanced_reports": false, "ai_insights": false, "multi_user": false}'::jsonb,
      true::boolean;
  END IF;
END;
$$;