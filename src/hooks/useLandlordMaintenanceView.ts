import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LandlordMaintenanceItem {
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
  assigned_to: string | null;
  rating: number | null;
  tenant_id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  assigned_user_name: string | null;
  assigned_user_email: string | null;
}

/**
 * Landlord/admin/consultant maintenance view via RPC.
 * Returns maintenance requests scoped to owned/assigned properties.
 */
export function useLandlordMaintenanceView() {
  return useQuery({
    queryKey: ["landlord-maintenance-view"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_landlord_maintenance_view");
      if (error) throw error;
      return (data || []) as LandlordMaintenanceItem[];
    },
  });
}
