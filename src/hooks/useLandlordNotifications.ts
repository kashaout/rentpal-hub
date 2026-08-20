import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LandlordNotification {
  id: string;
  landlord_user_id: string;
  tenant_user_id: string;
  lease_agreement_id: string | null;
  property_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useLandlordNotifications() {
  const { user, isLandlord } = useAuth();

  return useQuery({
    queryKey: ["landlord-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landlord_notifications")
        .select("*")
        .eq("landlord_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as unknown as LandlordNotification[];
    },
    enabled: !!user?.id && isLandlord,
  });
}

export function useUnreadLandlordNotificationCount() {
  const { data } = useLandlordNotifications();
  return data?.filter((n) => !n.is_read).length || 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("landlord_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-notifications"] });
    },
  });
}
