import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface PricingRule {
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
  created_at: string;
}

export type CreatePricingRuleInput = Omit<PricingRule, "id" | "created_at" | "landlord_id">;

/** All rules owned by current landlord (optionally filtered to property scope:
 *  rules attached to this property OR portfolio-wide rules). */
export function usePricingRules(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pricing-rules", user?.id, propertyId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("pricing_rules")
        .select("*")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      if (propertyId) {
        query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PricingRule[];
    },
    enabled: !!user,
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CreatePricingRuleInput) => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .insert({ ...input, landlord_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PricingRule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({ title: "Pricing rule created" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to create rule", description: sanitizeErrorMessage(e), variant: "destructive" }),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PricingRule> & { id: string }) => {
      const { error } = await supabase
        .from("pricing_rules")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to update rule", description: sanitizeErrorMessage(e), variant: "destructive" }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({ title: "Pricing rule deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to delete rule", description: sanitizeErrorMessage(e), variant: "destructive" }),
  });
}
