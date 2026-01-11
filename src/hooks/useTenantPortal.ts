import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TenantLeaseInfo {
  id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  unit_number: string;
  rent_amount: number;
  lease_start: string;
  lease_end: string;
  payment_status: "paid" | "pending" | "overdue";
}

export function useTenantLease() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-lease", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          property_id,
          unit_number,
          rent_amount,
          lease_start,
          lease_end,
          payment_status,
          properties!inner (
            name,
            address
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        property_id: data.property_id,
        property_name: (data.properties as any)?.name || "Unknown",
        property_address: (data.properties as any)?.address || "",
        unit_number: data.unit_number,
        rent_amount: Number(data.rent_amount),
        lease_start: data.lease_start,
        lease_end: data.lease_end,
        payment_status: data.payment_status as "paid" | "pending" | "overdue",
      } as TenantLeaseInfo;
    },
    enabled: !!user?.id,
  });
}
