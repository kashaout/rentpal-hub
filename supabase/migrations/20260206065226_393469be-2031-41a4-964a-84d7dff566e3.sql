-- Add currency and regional settings to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'NG',
ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_expenses NUMERIC DEFAULT 0;

-- Create financial transactions table for detailed P&L tracking
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio metrics table for caching calculated scores
CREATE TABLE public.portfolio_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI insights table for storing generated insights
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'opportunity')),
  action_items JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_transactions
CREATE POLICY "Block anonymous access to financial_transactions"
ON public.financial_transactions FOR SELECT
USING (false);

CREATE POLICY "Admins can manage all financial transactions"
ON public.financial_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Landlords can manage transactions in their properties"
ON public.financial_transactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = financial_transactions.property_id
    AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Consultants can manage transactions in assigned properties"
ON public.financial_transactions FOR ALL
USING (is_consultant_for_property(auth.uid(), property_id));

-- RLS policies for portfolio_metrics
CREATE POLICY "Block anonymous access to portfolio_metrics"
ON public.portfolio_metrics FOR SELECT
USING (false);

CREATE POLICY "Users can manage their own metrics"
ON public.portfolio_metrics FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics"
ON public.portfolio_metrics FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for ai_insights
CREATE POLICY "Block anonymous access to ai_insights"
ON public.ai_insights FOR SELECT
USING (false);

CREATE POLICY "Users can manage their own insights"
ON public.ai_insights FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all insights"
ON public.ai_insights FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_financial_transactions_property ON public.financial_transactions(property_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_portfolio_metrics_user ON public.portfolio_metrics(user_id);
CREATE INDEX idx_portfolio_metrics_property ON public.portfolio_metrics(property_id);
CREATE INDEX idx_ai_insights_user ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_dismissed ON public.ai_insights(is_dismissed);

-- Add trigger for updated_at on financial_transactions
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();