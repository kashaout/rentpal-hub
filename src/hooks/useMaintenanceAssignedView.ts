import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LandlordMaintenanceItem } from "@/hooks/useLandlordMaintenanceView";

/**
 * CANONICAL maintenance-resource data path.
 * Returns only maintenance_requests assigned to the current maintenance/vendor
 * user (enforced server-side by rpc_maintenance_assigned_view).
 */
export function useMaintenanceAssignedView(enabled = true) {
  return useQuery({
    queryKey: ["maintenance-assigned-view"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_maintenance_assigned_view");
      if (error) throw error;
      return (data || []) as unknown as LandlordMaintenanceItem[];
    },
  });
}
