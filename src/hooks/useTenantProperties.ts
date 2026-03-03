import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TenantProperty {
  id: string;
  name: string;
  address: string;
}

/**
 * Returns only properties the current tenant has access to
 * (via tenants table or confirmed bookings).
 */
export function useTenantProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-properties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get properties from tenants table
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("property_id, properties!inner(id, name, address)")
        .eq("user_id", user.id);

      // Get properties from confirmed bookings
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("property_id, properties!inner(id, name, address)")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "active", "completed"]);

      const map = new Map<string, TenantProperty>();

      for (const row of tenantRows || []) {
        const p = row.properties as any;
        if (p?.id) map.set(p.id, { id: p.id, name: p.name, address: p.address });
      }
      for (const row of bookingRows || []) {
        const p = row.properties as any;
        if (p?.id) map.set(p.id, { id: p.id, name: p.name, address: p.address });
      }

      return Array.from(map.values());
    },
    enabled: !!user?.id,
  });
}
