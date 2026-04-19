import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TenantLeaseInfo } from "@/hooks/useTenantPortal";

/**
 * Resolve a TenantLeaseInfo for an arbitrary property the current user is/was
 * a tenant on. Used by the Dashboard property selector so the user can switch
 * between current and past stays without losing context.
 *
 * Falls back gracefully when there's no signed lease for the property — in
 * that case it still resolves a tenants row + booking-derived defaults so the
 * payments tab can render historical data.
 */
export function useTenantLeaseByProperty(propertyId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-lease-by-property", user?.id, propertyId],
    enabled: !!user?.id && !!propertyId,
    queryFn: async (): Promise<TenantLeaseInfo | null> => {
      if (!user?.id || !propertyId) return null;

      const { data: prop } = await supabase
        .from("properties")
        .select("id, name, address")
        .eq("id", propertyId)
        .maybeSingle();
      if (!prop) return null;

      const { data: lease } = await supabase
        .from("lease_agreements" as any)
        .select("id, unit_number, rent_amount, currency, lease_start, lease_end")
        .eq("tenant_user_id", user.id)
        .eq("property_id", propertyId)
        .order("lease_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("id, payment_status, lease_start, lease_end, rent_amount, unit_number")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // We need *something* — either a signed lease or a tenants row
      if (!lease && !tenantRow) return null;

      const leaseAny: any = lease;
      const tenantAny: any = tenantRow;

      return {
        id: tenantAny?.id ?? leaseAny?.id ?? "",
        lease_id: leaseAny?.id ?? "",
        property_id: propertyId,
        property_name: (prop as any).name ?? "Property",
        property_address: (prop as any).address ?? "",
        unit_number: leaseAny?.unit_number ?? tenantAny?.unit_number ?? "—",
        rent_amount: Number(leaseAny?.rent_amount ?? tenantAny?.rent_amount ?? 0),
        lease_start: leaseAny?.lease_start ?? tenantAny?.lease_start ?? "",
        lease_end: leaseAny?.lease_end ?? tenantAny?.lease_end ?? "",
        payment_status: (tenantAny?.payment_status as "paid" | "pending" | "overdue") ?? "pending",
      };
    },
  });
}
