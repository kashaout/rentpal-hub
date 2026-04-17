import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";

export interface TenantLeaseInfo {
  id: string; // tenants.id (used by maintenance / payment hooks)
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
 * Tenant lease info — derived from the `active_tenants` view (single source of truth).
 *
 * Falls back to fetching the matching `tenants` row so legacy hooks
 * (payments, maintenance) that key off `tenants.id` continue to work.
 */
export function useTenantLease() {
  const { user } = useAuth();
  const { tenancy, isLoading: tenancyLoading } = useActiveTenant();

  return useQuery({
    queryKey: ["tenant-lease", user?.id, tenancy?.lease_id],
    queryFn: async (): Promise<TenantLeaseInfo | null> => {
      if (!user?.id || !tenancy) return null;

      // Look up the tenants row for this user + property to get tenants.id and payment_status
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("id, payment_status")
        .eq("user_id", user.id)
        .eq("property_id", tenancy.property_id)
        .eq("is_archived", false)
        .maybeSingle();

      return {
        id: tenantRow?.id ?? tenancy.lease_id, // fallback so downstream queries don't break
        lease_id: tenancy.lease_id,
        property_id: tenancy.property_id,
        property_name: tenancy.property_name,
        property_address: tenancy.property_address,
        unit_number: tenancy.unit_number,
        rent_amount: tenancy.rent_amount,
        lease_start: tenancy.lease_start,
        lease_end: tenancy.lease_end,
        payment_status: (tenantRow?.payment_status as "paid" | "pending" | "overdue") ?? "pending",
      };
    },
    enabled: !!user?.id && !!tenancy && !tenancyLoading,
  });
}
