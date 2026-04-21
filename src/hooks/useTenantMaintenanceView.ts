import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantMaintenanceItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  repair_notes: string | null;
  photo_urls: string[] | null;
  property_name: string;
  property_address: string;
}

/**
 * Tenant-safe maintenance view via RPC.
 * Returns only allowed columns — no rent, payment, or lease data.
 */
export function useTenantMaintenanceView() {
  return useQuery({
    queryKey: ["tenant-maintenance-view"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_tenant_maintenance_view");
      if (error) throw error;
      return (data || []) as TenantMaintenanceItem[];
    },
  });
}
