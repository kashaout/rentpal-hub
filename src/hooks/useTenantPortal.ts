import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantLifecycle } from "@/hooks/lifecycle/useTenantLifecycle";

export interface TenantLeaseInfo {
  /** Canonical tenants.id (bridge row PK). Used as tenant_id for payments/maintenance RLS. */
  id: string;
  /** lease_agreements.id — used for lease-specific reads (credentials, lease doc). */
  lease_id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  unit_number: string;
  rent_amount: number;
  lease_start: string;
  lease_end: string;
  payment_status: "paid" | "pending" | "overdue";
}

/**
 * THIN ADAPTER — derives the tenant's "active" lease from the canonical
 * useTenantLifecycle chain, then resolves the matching tenants.id bridge row
 * so downstream `tenant_id` consumers (payments, maintenance, RLS) work.
 */
export function useTenantLease() {
  const lc = useTenantLifecycle();
  const { user } = useAuth();

  const activePropertyId = lc.active?.property_id ?? null;

  const { data: tenantBridgeId } = useQuery({
    queryKey: ["tenant-bridge-id", user?.id, activePropertyId],
    enabled: !!user?.id && !!activePropertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user!.id)
        .eq("property_id", activePropertyId!)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.id ?? null;
    },
  });

  const data = useMemo<TenantLeaseInfo | null>(() => {
    const row = lc.active;
    if (!row || !row.lease_id) return null;
    return {
      id: tenantBridgeId ?? "",
      lease_id: row.lease_id,
      property_id: row.property_id,
      property_name: row.property_name,
      property_address: row.property_address,
      unit_number: row.unit_number,
      rent_amount: row.rent_amount,
      lease_start: row.lease_start ?? "",
      lease_end: row.lease_end ?? "",
      payment_status: row.isPaid ? "paid" : "pending",
    };
  }, [lc.active, tenantBridgeId]);

  return {
    data,
    isLoading: lc.isLoading,
    isError: lc.isError,
  };
}
