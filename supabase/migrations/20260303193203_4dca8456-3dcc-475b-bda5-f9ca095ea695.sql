
-- 2. SLA Configuration table
CREATE TABLE public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL UNIQUE,
  response_minutes integer NOT NULL,
  resolution_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SLA configs" ON public.sla_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view SLA configs" ON public.sla_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Block anonymous access to sla_configs" ON public.sla_configs FOR SELECT TO anon USING (false);

-- Seed default SLA configs
INSERT INTO public.sla_configs (severity, response_minutes, resolution_minutes) VALUES
  ('emergency', 60, 240),
  ('high', 240, 1440),
  ('medium', 720, 4320),
  ('low', 1440, 7200);

-- 3. Work Orders table
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid,
  vendor_id uuid,
  status text NOT NULL DEFAULT 'created',
  priority_score numeric DEFAULT 0,
  severity text NOT NULL DEFAULT 'medium',
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  labor_hours numeric DEFAULT 0,
  parts_used jsonb DEFAULT '[]'::jsonb,
  approval_required boolean DEFAULT false,
  approval_status text DEFAULT 'not_required',
  approved_by uuid,
  approved_at timestamptz,
  sla_response_deadline timestamptz,
  sla_resolution_deadline timestamptz,
  sla_response_met boolean,
  sla_resolution_met boolean,
  before_photos text[] DEFAULT '{}',
  after_photos text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  verified_at timestamptz,
  closed_at timestamptz
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all work orders" ON public.work_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can manage work orders for their properties" ON public.work_orders FOR ALL TO authenticated USING (public.is_landlord_of_property(auth.uid(), property_id));
CREATE POLICY "Maintenance users can manage work orders" ON public.work_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'maintenance'));
CREATE POLICY "Vendors can manage assigned work orders" ON public.work_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'vendor') AND vendor_id = auth.uid());
CREATE POLICY "Consultants can manage work orders for assigned properties" ON public.work_orders FOR ALL TO authenticated USING (public.is_consultant_for_property(auth.uid(), property_id));
CREATE POLICY "Tenants can view work orders for their property" ON public.work_orders FOR SELECT TO authenticated USING (public.is_tenant_of_property(auth.uid(), property_id));
CREATE POLICY "Block anonymous access to work_orders" ON public.work_orders FOR SELECT TO anon USING (false);

-- 4. Maintenance Logs
CREATE TABLE public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  previous_status text,
  new_status text,
  action text NOT NULL,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all maintenance logs" ON public.maintenance_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view logs for accessible work orders" ON public.maintenance_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = maintenance_logs.work_order_id AND (
    public.is_landlord_of_property(auth.uid(), wo.property_id) OR
    public.is_tenant_of_property(auth.uid(), wo.property_id) OR
    public.is_consultant_for_property(auth.uid(), wo.property_id) OR
    public.has_role(auth.uid(), 'maintenance') OR
    (public.has_role(auth.uid(), 'vendor') AND wo.vendor_id = auth.uid())
  ))
);
CREATE POLICY "Authenticated can insert maintenance logs" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Block anonymous access to maintenance_logs" ON public.maintenance_logs FOR SELECT TO anon USING (false);

-- 5. Escrow Transactions
CREATE TABLE public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_user_id uuid NOT NULL,
  landlord_user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  transaction_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  reference_id text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_by uuid
);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all escrow transactions" ON public.escrow_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can view their escrow transactions" ON public.escrow_transactions FOR SELECT TO authenticated USING (landlord_user_id = auth.uid());
CREATE POLICY "Tenants can view their escrow transactions" ON public.escrow_transactions FOR SELECT TO authenticated USING (tenant_user_id = auth.uid());
CREATE POLICY "Tenants can create escrow transactions" ON public.escrow_transactions FOR INSERT TO authenticated WITH CHECK (tenant_user_id = auth.uid());
CREATE POLICY "Block anonymous access to escrow_transactions" ON public.escrow_transactions FOR SELECT TO anon USING (false);

-- 6. Disputes
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  filed_by uuid NOT NULL,
  against_user uuid NOT NULL,
  dispute_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  resolution_type text,
  resolution_amount numeric DEFAULT 0,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  payout_frozen boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all disputes" ON public.disputes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view disputes they filed" ON public.disputes FOR SELECT TO authenticated USING (filed_by = auth.uid());
CREATE POLICY "Users can view disputes filed against them" ON public.disputes FOR SELECT TO authenticated USING (against_user = auth.uid());
CREATE POLICY "Users can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (filed_by = auth.uid());
CREATE POLICY "Landlords can view disputes for their properties" ON public.disputes FOR SELECT TO authenticated USING (public.is_landlord_of_property(auth.uid(), property_id));
CREATE POLICY "Block anonymous access to disputes" ON public.disputes FOR SELECT TO anon USING (false);

-- 7. Property Safety Flags
CREATE TABLE public.property_safety_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  flag_type text NOT NULL,
  triggered_by_work_order_id uuid REFERENCES public.work_orders(id),
  is_active boolean DEFAULT true,
  listing_paused boolean DEFAULT true,
  bookings_blocked boolean DEFAULT true,
  flagged_by uuid NOT NULL,
  cleared_by uuid,
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_safety_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all safety flags" ON public.property_safety_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Landlords can view safety flags for their properties" ON public.property_safety_flags FOR SELECT TO authenticated USING (public.is_landlord_of_property(auth.uid(), property_id));
CREATE POLICY "Maintenance can create safety flags" ON public.property_safety_flags FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'maintenance') OR public.has_role(auth.uid(), 'vendor'));
CREATE POLICY "Block anonymous access to property_safety_flags" ON public.property_safety_flags FOR SELECT TO anon USING (false);

-- 8. Reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid,
  review_type text NOT NULL,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  location_rating integer CHECK (location_rating >= 1 AND location_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  issue_resolution_rating integer CHECK (issue_resolution_rating >= 1 AND issue_resolution_rating <= 5),
  comment text,
  is_public boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  review_window_closes_at timestamptz
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Authenticated can view public reviews" ON public.reviews FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can view own reviews" ON public.reviews FOR SELECT TO authenticated USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());
CREATE POLICY "Block anonymous access to reviews" ON public.reviews FOR SELECT TO anon USING (false);

-- 9. Extend bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS soft_lock_expires_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_soft_lock boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dispute_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payout_released_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by uuid;

-- 10. Extend properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approval_threshold numeric DEFAULT 50000;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT 'moderate';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS house_rules text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS safety_features jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS host_reliability_score numeric DEFAULT 100;

-- 11. Extend profiles for performance tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS technician_performance_score numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vendor_performance_score numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_jobs_completed integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sla_compliance_rate numeric DEFAULT 100;

-- 12. Triggers
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sla_configs_updated_at BEFORE UPDATE ON public.sla_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
