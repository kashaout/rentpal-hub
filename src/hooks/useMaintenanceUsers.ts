import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

export function useMaintenanceUsers() {
  return useQuery({
    queryKey: ["maintenance-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_maintenance_users");
      if (error) throw error;
      return data as MaintenanceUser[];
    },
  });
}
