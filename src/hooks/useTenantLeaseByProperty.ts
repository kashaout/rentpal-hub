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

      const { data: propRows } = await supabase.rpc("get_tenant_property_summary" as any, {
        _property_ids: [propertyId],
      });
      const prop = (propRows as any[])?.[0];
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

      // Also check for a paid/confirmed booking — a tenant who paid but
      // hasn't gotten a signed lease yet must still see their tenancy.
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, total_price, status, payment_status")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Render as long as we have ANY proof of tenancy
      if (!lease && !tenantRow && !booking) return null;

      const leaseAny: any = lease;
      const tenantAny: any = tenantRow;
      const bookingAny: any = booking;

      // Canonical id = tenants.id (bridge row PK) so downstream tenant_id
      // consumers (payments, maintenance, RLS via active_tenants) work.
      // lease_id stays separate for lease-specific reads.
      const canonicalId = tenantAny?.id ?? "";

      // Paid TRUTH SOURCE: payments.status='completed' for this lease, else
      // fall back to tenants.payment_status='paid'. Never derive from booking.
      let paid = false;
      if (leaseAny?.id) {
        const { data: payRows } = await supabase
          .from("payments")
          .select("status")
          .eq("lease_id", leaseAny.id)
          .eq("status", "completed")
          .limit(1);
        paid = !!(payRows && payRows.length);
      }
      if (!paid && tenantAny?.payment_status === "paid") {
        paid = true;
      }

      return {
        id: canonicalId,
        lease_id: leaseAny?.id ?? "",
        property_id: propertyId,
        property_name: (prop as any).name ?? "Property",
        property_address: (prop as any).address ?? "",
        unit_number: leaseAny?.unit_number ?? tenantAny?.unit_number ?? "—",
        rent_amount: Number(leaseAny?.rent_amount ?? tenantAny?.rent_amount ?? bookingAny?.total_price ?? 0),
        lease_start: leaseAny?.lease_start ?? tenantAny?.lease_start ?? bookingAny?.check_in ?? "",
        lease_end: leaseAny?.lease_end ?? tenantAny?.lease_end ?? bookingAny?.check_out ?? "",
        payment_status: paid
          ? "paid"
          : (tenantAny?.payment_status as "paid" | "pending" | "overdue") ?? "pending",
      };
    },
  });
}
