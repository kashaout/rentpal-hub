import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { decodeBookingNotes, isAfterCheckOut } from "@/lib/bookingTime";

export interface TenantPaidStatus {
  paid: boolean;
  /** When the user is "still in" the rental period and shouldn't be charged again */
  withinActivePeriod: boolean;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  source: "payment" | "booking" | "tenants" | "none";
}

/**
 * Resolves the *real* paid status for a tenant on a given property by checking
 * (in priority order):
 *   1. payments table tied to tenants for this property
 *   2. bookings.payment_status === "paid" (and check-out not yet passed)
 *   3. tenants.payment_status fallback
 */
export function useTenantPaidStatus(propertyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-paid-status", user?.id, propertyId],
    enabled: !!user?.id && !!propertyId,
    queryFn: async (): Promise<TenantPaidStatus> => {
      if (!user?.id || !propertyId) {
        return { paid: false, withinActivePeriod: false, source: "none" };
      }

      // 1) Look at the tenants row(s) for this user + property
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id, payment_status, lease_end, lease_start")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .eq("is_archived", false);

      const tenantIds = (tenantRows ?? []).map((t: any) => t.id);

      // 2) Most recent completed payment for any of those tenant rows
      if (tenantIds.length > 0) {
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, payment_date, status")
          .in("tenant_id", tenantIds)
          .in("status", ["completed", "paid"])
          .order("payment_date", { ascending: false })
          .limit(1);

        if (payments && payments[0]) {
          const activeTenant = (tenantRows ?? []).find(
            (t: any) => new Date(t.lease_end) >= new Date()
          );
          return {
            paid: true,
            withinActivePeriod: !!activeTenant,
            lastPaymentDate: payments[0].payment_date,
            lastPaymentAmount: Number(payments[0].amount),
            source: "payment",
          };
        }
      }

      // 3) Booking-based payment (Airbnb / short stays)
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, payment_status, status, total_price, notes")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .in("payment_status", ["paid", "completed"])
        .order("check_in", { ascending: false })
        .limit(1);

      if (bookings && bookings[0]) {
        const b: any = bookings[0];
        const decoded = decodeBookingNotes(b.notes);
        const stillActive = !isAfterCheckOut(b.check_out, decoded.checkOutTime);
        return {
          paid: true,
          withinActivePeriod: stillActive,
          lastPaymentDate: b.check_in,
          lastPaymentAmount: Number(b.total_price ?? 0),
          source: "booking",
        };
      }

      // 4) Fallback to tenants.payment_status flag
      const flagged = (tenantRows ?? []).find((t: any) => t.payment_status === "paid");
      if (flagged) {
        return {
          paid: true,
          withinActivePeriod: new Date((flagged as any).lease_end) >= new Date(),
          source: "tenants",
        };
      }

      return { paid: false, withinActivePeriod: false, source: "none" };
    },
  });
}
