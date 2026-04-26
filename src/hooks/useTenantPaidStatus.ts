import { useMemo } from "react";
import { useTenantLifecycle } from "@/hooks/lifecycle/useTenantLifecycle";
import { decodeBookingNotes, isAfterCheckOut } from "@/lib/bookingTime";

export interface TenantPaidStatus {
  paid: boolean;
  withinActivePeriod: boolean;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  source: "lifecycle" | "none";
}

/**
 * THIN ADAPTER over useTenantLifecycle. The single source of paid-status
 * truth for any tenant page is the lifecycle row for that property.
 */
export function useTenantPaidStatus(propertyId?: string) {
  const lc = useTenantLifecycle();

  const data = useMemo<TenantPaidStatus>(() => {
    if (!propertyId) return { paid: false, withinActivePeriod: false, source: "none" };
    const row = lc.properties.find((p) => p.property_id === propertyId);
    if (!row) return { paid: false, withinActivePeriod: false, source: "none" };
    if (!row.isPaid) return { paid: false, withinActivePeriod: false, source: "none" };

    // Determine if the rental window is still active
    let stillActive = false;
    if (row.lease_end) {
      stillActive = new Date(row.lease_end) >= new Date();
    } else if (row.check_out) {
      stillActive = !isAfterCheckOut(row.check_out, "11:00");
    }

    return {
      paid: true,
      withinActivePeriod: stillActive,
      lastPaymentDate: row.check_in ?? row.lease_start ?? undefined,
      lastPaymentAmount: row.total_price || row.rent_amount,
      source: "lifecycle",
    };
  }, [propertyId, lc.properties]);

  return {
    data,
    isLoading: lc.isLoading,
    isError: lc.isError,
  };
}
