import { useMemo } from "react";
import { useTenantLifecycle } from "@/hooks/lifecycle/useTenantLifecycle";

export interface TenantLeaseInfo {
  id: string; // legacy "tenants.id" — now always equals lease_id (the canonical id)
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
 * useTenantLifecycle chain. The shape is preserved so downstream legacy
 * consumers (sidebar, payments, maintenance) keep working.
 */
export function useTenantLease() {
  const lc = useTenantLifecycle();

  const data = useMemo<TenantLeaseInfo | null>(() => {
    const row = lc.active;
    if (!row || !row.lease_id) return null;
    return {
      id: row.lease_id,
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
  }, [lc.active]);

  return {
    data,
    isLoading: lc.isLoading,
    isError: lc.isError,
  };
}
