import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ActiveTenancy {
  lease_id: string;
  property_id: string;
  landlord_user_id: string;
  tenant_user_id: string;
  lease_start: string;
  lease_end: string;
  tenant_signed_at: string;
  landlord_signed_at: string;
  property_name: string;
  property_address: string;
  unit_number: string;
  rent_amount: number;
  currency: string;
}

/**
 * Single source of truth for tenant access.
 * A user becomes an "active tenant" the moment a lease has BOTH
 * tenant_signed_at and landlord_signed_at populated.
 *
 * This hook reactively unlocks the tenant app — no role check, no
 * subscription check, no manual flag. Pure lease-state driven.
 */
export function useActiveTenant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["active-tenant", user?.id],
    queryFn: async (): Promise<ActiveTenancy | null> => {
      if (!user?.id) return null;

      // Source of truth: active_tenants view (joins lease_agreements for the property info)
      const { data, error } = await supabase
        .from("active_tenants")
        .select("*")
        .eq("tenant_user_id", user.id)
        .order("lease_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // The active_tenants view exposes nullable columns; a tenancy without a
      // resolvable lease/property is not actionable, so treat it as "none".
      const leaseId = data.lease_id;
      const propertyId = data.property_id;
      if (!leaseId || !propertyId) return null;

      // Lease detail + property summary are independent — run them in parallel
      // instead of two sequential round trips.
      const [leaseResult, propResult] = await Promise.all([
        supabase
          .from("lease_agreements")
          .select("unit_number, rent_amount, currency, property_id")
          .eq("id", leaseId)
          .maybeSingle(),
        supabase.rpc("get_tenant_property_summary", { _property_ids: [propertyId] }),
      ]);

      if (leaseResult.error) throw leaseResult.error;
      if (propResult.error) throw propResult.error;

      const leaseDetails = leaseResult.data;
      const prop = propResult.data?.[0];

      return {
        lease_id: leaseId,
        property_id: propertyId,
        landlord_user_id: data.landlord_user_id ?? "",
        tenant_user_id: data.tenant_user_id ?? "",
        lease_start: data.lease_start ?? "",
        lease_end: data.lease_end ?? "",
        tenant_signed_at: data.tenant_signed_at ?? "",
        landlord_signed_at: data.landlord_signed_at ?? "",
        property_name: prop?.name ?? "My Property",
        property_address: prop?.address ?? "",
        unit_number: leaseDetails?.unit_number ?? "",
        rent_amount: Number(leaseDetails?.rent_amount ?? 0),
        currency: leaseDetails?.currency ?? "NGN",
      };
    },

    enabled: !!user?.id,
    staleTime: 30_000,
  });


  return {
    ...query,
    isActiveTenant: !!query.data,
    tenancy: query.data ?? null,
  };
}
