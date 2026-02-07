-- Create compliance category enum
CREATE TYPE public.compliance_category AS ENUM (
  'tenancy_agreement',
  'land_title',
  'service_charge',
  'building_permit',
  'fire_safety',
  'environmental',
  'utility_registration',
  'insurance',
  'other'
);

-- Create compliance status enum
CREATE TYPE public.compliance_status AS ENUM (
  'compliant',
  'pending',
  'expired',
  'non_compliant',
  'not_applicable'
);

-- Create compliance_items table
CREATE TABLE public.compliance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category compliance_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status compliance_status NOT NULL DEFAULT 'pending',
  issue_date DATE,
  expiry_date DATE,
  reminder_days INTEGER DEFAULT 30,
  document_url TEXT,
  notes TEXT,
  last_inspection_date DATE,
  next_inspection_date DATE,
  inspector_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Block anonymous access to compliance_items"
ON public.compliance_items FOR SELECT
USING (false);

CREATE POLICY "Admins can manage all compliance items"
ON public.compliance_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Landlords can manage compliance in their properties"
ON public.compliance_items FOR ALL
USING (is_landlord_of_property(auth.uid(), property_id));

CREATE POLICY "Consultants can manage compliance in assigned properties"
ON public.compliance_items FOR ALL
USING (is_consultant_for_property(auth.uid(), property_id));

CREATE POLICY "Tenants can view compliance for their property"
ON public.compliance_items FOR SELECT
USING (is_tenant_of_property(auth.uid(), property_id));

-- Create indexes for performance
CREATE INDEX idx_compliance_items_property ON public.compliance_items(property_id);
CREATE INDEX idx_compliance_items_status ON public.compliance_items(status);
CREATE INDEX idx_compliance_items_expiry ON public.compliance_items(expiry_date);
CREATE INDEX idx_compliance_items_category ON public.compliance_items(category);

-- Add trigger for updated_at
CREATE TRIGGER update_compliance_items_updated_at
BEFORE UPDATE ON public.compliance_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create compliance_alerts table for tracking notifications
CREATE TABLE public.compliance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_item_id UUID NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_soon', 'expired', 'inspection_due', 'action_required')),
  message TEXT NOT NULL,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for compliance_alerts
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to compliance_alerts"
ON public.compliance_alerts FOR SELECT
USING (false);

CREATE POLICY "Admins can manage all compliance alerts"
ON public.compliance_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Landlords can manage alerts in their properties"
ON public.compliance_alerts FOR ALL
USING (is_landlord_of_property(auth.uid(), property_id));

CREATE POLICY "Consultants can manage alerts in assigned properties"
ON public.compliance_alerts FOR ALL
USING (is_consultant_for_property(auth.uid(), property_id));

-- Index for compliance alerts
CREATE INDEX idx_compliance_alerts_property ON public.compliance_alerts(property_id);
CREATE INDEX idx_compliance_alerts_item ON public.compliance_alerts(compliance_item_id);
CREATE INDEX idx_compliance_alerts_dismissed ON public.compliance_alerts(is_dismissed);