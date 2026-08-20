import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricingPreview {
  original_price: number;
  discount_amount: number;
  final_price: number;
  rule_id: string | null;
  rule_name: string | null;
}

interface Args {
  propertyId?: string | null;
  startDate?: string | null; // yyyy-MM-dd
  endDate?: string | null;   // yyyy-MM-dd
  promoCode?: string | null;
  enabled?: boolean;
}

/**
 * Tenant-safe pricing preview.
 *
 * Calls the SECURITY DEFINER RPC `rpc_preview_pricing` which mirrors the
 * authoritative engine used at booking insert time. Tenants never read
 * pricing_rules directly. React Query caches per (property + dates + promo)
 * so changing inputs hits the RPC, not a full rules refetch.
 */
export function usePricingPreview({
  propertyId,
  startDate,
  endDate,
  promoCode,
  enabled = true,
}: Args) {
  return useQuery({
    queryKey: [
      "pricing-preview",
      propertyId ?? null,
      startDate ?? null,
      endDate ?? null,
      (promoCode ?? "").trim().toLowerCase() || null,
    ],
    queryFn: async (): Promise<PricingPreview | null> => {
      if (!propertyId || !startDate || !endDate) return null;
      const { data, error } = await supabase.rpc("rpc_preview_pricing", {
        p_property_id: propertyId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_promo_code: promoCode?.trim() ? promoCode.trim() : null,
      });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        original_price: Number(row.original_price) || 0,
        discount_amount: Number(row.discount_amount) || 0,
        final_price: Number(row.final_price) || 0,
        rule_id: row.rule_id ?? null,
        rule_name: row.rule_name ?? null,
      };
    },
    enabled: Boolean(enabled && propertyId && startDate && endDate),
    staleTime: 60_000,
  });
}
