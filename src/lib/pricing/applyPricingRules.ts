/**
 * Pricing Rules Engine — pure logic, no UI.
 *
 * Used at booking creation AND in tenant booking preview.
 * Produces a write-once snapshot that booking/lease/payments downstream consume.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PricingInput {
  property_id: string;
  landlord_id: string;
  base_price: number;
  months?: number | null;
  nights?: number | null;
  promo_code?: string | null;
  /** Optional date the booking applies on (defaults to today) */
  on_date?: Date;
}

export interface PricingResult {
  original_price: number;
  discount_amount: number;
  final_price: number;
  rule_id: string | null;
  rule_name: string | null;
}

interface PricingRuleRow {
  id: string;
  landlord_id: string;
  property_id: string | null;
  name: string;
  rule_type: "percent" | "fixed";
  value: number;
  min_months: number | null;
  min_nights: number | null;
  start_date: string | null;
  end_date: string | null;
  promo_code: string | null;
  auto_apply: boolean;
  active: boolean;
}

function ruleApplies(rule: PricingRuleRow, input: PricingInput): boolean {
  if (!rule.active) return false;
  if (rule.property_id && rule.property_id !== input.property_id) return false;

  const today = (input.on_date ?? new Date()).toISOString().slice(0, 10);
  if (rule.start_date && today < rule.start_date) return false;
  if (rule.end_date && today > rule.end_date) return false;

  if (rule.min_months != null && (input.months ?? 0) < rule.min_months) return false;
  if (rule.min_nights != null && (input.nights ?? 0) < rule.min_nights) return false;

  // Promo gating: a coded rule requires that exact code; uncoded rules need auto_apply
  if (rule.promo_code) {
    if (!input.promo_code) return false;
    if (rule.promo_code.trim().toLowerCase() !== input.promo_code.trim().toLowerCase()) {
      return false;
    }
  } else if (!rule.auto_apply) {
    return false;
  }

  return true;
}

function computeDiscount(rule: PricingRuleRow, base: number): number {
  const raw = rule.rule_type === "percent" ? (base * rule.value) / 100 : rule.value;
  // Clamp 0..base
  return Math.max(0, Math.min(base, Math.round(raw * 100) / 100));
}

const noDiscount = (base: number): PricingResult => ({
  original_price: base,
  discount_amount: 0,
  final_price: base,
  rule_id: null,
  rule_name: null,
});

export async function applyPricingRules(input: PricingInput): Promise<PricingResult> {
  const base = Number(input.base_price) || 0;
  if (base <= 0 || !input.property_id || !input.landlord_id) {
    return noDiscount(base);
  }

  // Note: tenants cannot read pricing_rules directly per RLS. This call is
  // safe because the booking insert path (and landlord-side preview) runs
  // under a session that can read its own landlord rules. For tenant preview
  // we route through the same call: if it returns nothing due to RLS, we
  // simply show no discount in the UI — Stripe + lifecycle stay consistent
  // because the authoritative computation runs again at booking insert time.
  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("landlord_id", input.landlord_id)
    .eq("active", true);

  if (error || !data) return noDiscount(base);

  const candidates = (data as unknown as PricingRuleRow[]).filter((r) =>
    ruleApplies(r, input)
  );
  if (candidates.length === 0) return noDiscount(base);

  // Sort deterministically so equal-discount ties resolve predictably:
  //   1) property-scoped rule beats global (property_id NOT NULL first)
  //   2) earlier start_date wins (NULL treated as very old)
  //   3) lower id wins as final tie-breaker
  const sorted = [...candidates].sort((a, b) => {
    const aScoped = a.property_id ? 0 : 1;
    const bScoped = b.property_id ? 0 : 1;
    if (aScoped !== bScoped) return aScoped - bScoped;
    const aDate = a.start_date ?? "1900-01-01";
    const bDate = b.start_date ?? "1900-01-01";
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Pick BEST (largest) discount. Strictly greater wins, so deterministic
  // sort order naturally breaks ties (first match keeps the win).
  let best: { rule: PricingRuleRow; discount: number } | null = null;
  for (const r of sorted) {
    const d = computeDiscount(r, base);
    if (!best || d > best.discount) best = { rule: r, discount: d };
  }
  if (!best || best.discount <= 0) return noDiscount(base);

  return {
    original_price: base,
    discount_amount: best.discount,
    final_price: Math.max(0, base - best.discount),
    rule_id: best.rule.id,
    rule_name: best.rule.name,
  };
}
