-- 1) Integrity constraints on pricing_rules
ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_date_range_chk
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_min_exclusive_chk
    CHECK (min_months IS NULL OR min_nights IS NULL);

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_value_positive_chk
    CHECK (value > 0);

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_percent_max_chk
    CHECK (rule_type <> 'percent' OR value <= 100);

-- 2) Tenant-safe pricing preview RPC.
-- SECURITY DEFINER so it can read pricing_rules owned by the property's landlord,
-- but only returns the computed snapshot — never raw rules.
CREATE OR REPLACE FUNCTION public.rpc_preview_pricing(
  p_property_id uuid,
  p_start_date date,
  p_end_date date,
  p_promo_code text DEFAULT NULL
)
RETURNS TABLE (
  original_price numeric,
  discount_amount numeric,
  final_price numeric,
  rule_id uuid,
  rule_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landlord uuid;
  v_monthly numeric;
  v_nights int;
  v_months int;
  v_base numeric;
  v_today date := CURRENT_DATE;
  v_best record;
  v_best_discount numeric := 0;
  r record;
  v_disc numeric;
BEGIN
  SELECT p.landlord_id, p.monthly_rent
    INTO v_landlord, v_monthly
  FROM public.properties p
  WHERE p.id = p_property_id
    AND p.is_archived = false
    AND (p.is_paused IS NULL OR p.is_paused = false);

  IF v_landlord IS NULL OR p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  v_nights := GREATEST(0, (p_end_date - p_start_date));
  v_months := GREATEST(1, CEIL(v_nights::numeric / 30)::int);
  v_base := ROUND(COALESCE(v_monthly, 0)::numeric * v_months, 2);

  IF v_base <= 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Deterministic ordering: property-scoped first, then earliest start_date, then lowest id
  FOR r IN
    SELECT *
    FROM public.pricing_rules pr
    WHERE pr.landlord_id = v_landlord
      AND pr.active = true
      AND (pr.property_id IS NULL OR pr.property_id = p_property_id)
      AND (pr.start_date IS NULL OR pr.start_date <= v_today)
      AND (pr.end_date IS NULL OR pr.end_date >= v_today)
      AND (pr.min_months IS NULL OR v_months >= pr.min_months)
      AND (pr.min_nights IS NULL OR v_nights >= pr.min_nights)
      AND (
        (pr.promo_code IS NOT NULL AND p_promo_code IS NOT NULL
          AND lower(btrim(pr.promo_code)) = lower(btrim(p_promo_code)))
        OR (pr.promo_code IS NULL AND pr.auto_apply = true)
      )
    ORDER BY
      (pr.property_id IS NULL) ASC,    -- false first => property-scoped first
      COALESCE(pr.start_date, DATE '1900-01-01') ASC,
      pr.id ASC
  LOOP
    v_disc := CASE
      WHEN r.rule_type = 'percent' THEN ROUND(v_base * r.value / 100.0, 2)
      ELSE ROUND(r.value, 2)
    END;
    v_disc := GREATEST(0, LEAST(v_base, v_disc));

    -- Strictly greater wins; ties keep the earlier (deterministic) winner.
    IF v_disc > v_best_discount THEN
      v_best_discount := v_disc;
      v_best := r;
    END IF;
  END LOOP;

  IF v_best_discount <= 0 OR v_best IS NULL THEN
    RETURN QUERY SELECT v_base, 0::numeric, v_base, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_base,
    v_best_discount,
    GREATEST(0, v_base - v_best_discount),
    v_best.id,
    v_best.name;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_preview_pricing(uuid, date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_preview_pricing(uuid, date, date, text) TO authenticated;