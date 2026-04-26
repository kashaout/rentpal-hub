import { useMemo } from "react";
import { useLandlordLifecycle, LandlordTenantDerived } from "@/hooks/lifecycle/useLandlordLifecycle";

/**
 * THIN ADAPTER — delegates to the canonical landlord lifecycle.
 * Do NOT add direct supabase reads here. All landlord tenant data
 * derives from properties → bookings → lease_agreements via
 * useLandlordLifecycle.
 */
export interface LandlordTenantRow {
  id: string;
  source: "lease" | "tenants" | "booking";
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_user_id: string | null;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent_amount: number;
  currency: string;
  lease_start: string;
  lease_end: string;
  payment_status: "paid" | "pending" | "overdue";
  fully_signed: boolean;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
}

function adapt(t: LandlordTenantDerived): LandlordTenantRow {
  return {
    id: t.id,
    source: t.source,
    property_id: t.property_id,
    property_name: t.property_name,
    unit_number: t.unit_number,
    tenant_user_id: t.tenant_user_id,
    tenant_name: t.tenant_name,
    tenant_email: t.tenant_email,
    tenant_phone: t.tenant_phone,
    rent_amount: t.rent_amount,
    currency: t.currency,
    lease_start: t.lease_start ?? "",
    lease_end: t.lease_end ?? "",
    payment_status: t.payment_status,
    fully_signed: t.fully_signed,
    tenant_signed_at: t.tenant_signed_at,
    landlord_signed_at: t.landlord_signed_at,
  };
}

export function useLandlordTenants() {
  const lc = useLandlordLifecycle();
  const data = useMemo(() => lc.tenants.map(adapt), [lc.tenants]);
  return {
    data,
    isLoading: lc.isLoading,
    isError: lc.isError,
    error: null as unknown as Error | null,
    refetch: () => Promise.resolve({ data }),
  };
}
