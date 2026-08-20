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
      const lease = data as any;

      // Fetch related lease agreement details + property
      const { data: leaseRow, error: leaseErr } = await supabase
        .from("lease_agreements")
        .select("unit_number, rent_amount, currency, property_id")
        .eq("id", lease.lease_id)
        .maybeSingle();

      if (leaseErr) throw leaseErr;
      const leaseDetails = leaseRow as any;

      const { data: propRows, error: propErr } = await supabase.rpc(
        "get_tenant_property_summary",
        { _property_ids: [lease.property_id] }
      );
      if (propErr) throw propErr;
      const prop = (propRows as any[])?.[0];

      // TEMP guard log — confirms tenant access derived from active_tenants
      console.log("[useActiveTenant] active tenancy resolved:", {
        user_id: user.id,
        lease_id: lease.lease_id,
        property_id: lease.property_id,
      });

      return {
        lease_id: lease.lease_id,
        property_id: lease.property_id,
        landlord_user_id: lease.landlord_user_id,
        tenant_user_id: lease.tenant_user_id,
        lease_start: lease.lease_start,
        lease_end: lease.lease_end,
        tenant_signed_at: lease.tenant_signed_at,
        landlord_signed_at: lease.landlord_signed_at,
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

  // Realtime: refetch the moment the lease state changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`active-tenant-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lease_agreements",
          filter: `tenant_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-tenant", user.id] });
          queryClient.invalidateQueries({ queryKey: ["lease-agreements"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    ...query,
    isActiveTenant: !!query.data,
    tenancy: query.data ?? null,
  };
}
