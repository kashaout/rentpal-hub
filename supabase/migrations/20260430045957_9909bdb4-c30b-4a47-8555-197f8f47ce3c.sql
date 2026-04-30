-- 1) pricing_rules table
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  property_id uuid NULL,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value >= 0),
  min_months integer NULL,
  min_nights integer NULL,
  start_date date NULL,
  end_date date NULL,
  promo_code text NULL,
  auto_apply boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_rules_landlord ON public.pricing_rules(landlord_id);
CREATE INDEX idx_pricing_rules_property ON public.pricing_rules(property_id);
CREATE INDEX idx_pricing_rules_promo ON public.pricing_rules(promo_code) WHERE promo_code IS NOT NULL;

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Landlords manage their own rules
CREATE POLICY "Landlords manage own pricing rules"
ON public.pricing_rules FOR ALL TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

-- Admin full access
CREATE POLICY "Admins manage all pricing rules"
ON public.pricing_rules FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous
CREATE POLICY "Block anon access to pricing_rules"
ON public.pricing_rules FOR SELECT TO anon
USING (false);

CREATE TRIGGER update_pricing_rules_updated_at
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend bookings: write-once price snapshot
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_price numeric NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_price numeric NULL,
  ADD COLUMN IF NOT EXISTS pricing_rule_id uuid NULL;

-- Enforce write-once on price snapshot fields (non-admin can't change after insert)
CREATE OR REPLACE FUNCTION public.restrict_booking_price_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    -- Once set, freeze. If never set, allow first-time set.
    IF OLD.original_price IS NOT NULL THEN
      NEW.original_price := OLD.original_price;
    END IF;
    IF OLD.final_price IS NOT NULL THEN
      NEW.final_price := OLD.final_price;
    END IF;
    IF OLD.pricing_rule_id IS NOT NULL THEN
      NEW.pricing_rule_id := OLD.pricing_rule_id;
    END IF;
    -- discount_amount: freeze once final_price was set
    IF OLD.final_price IS NOT NULL THEN
      NEW.discount_amount := OLD.discount_amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_booking_price_snapshot ON public.bookings;
CREATE TRIGGER trg_restrict_booking_price_snapshot
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.restrict_booking_price_snapshot();
