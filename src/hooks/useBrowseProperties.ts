import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BrowseProperty {
  id: string;
  name: string;
  address: string;
  description: string | null;
  image_url: string | null;
  property_type: string;
  listing_type: string;
  monthly_rent: number;
  currency: string;
  units: number;
  region: string;
  amenities: string[];
  is_paused: boolean;
  landlord_business_name: string | null;
  landlord_name: string | null;
}

export function useBrowseProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["browse-properties"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_property_listings", {
        _property_id: null,
      });

      console.log("[useBrowseProperties] public listings rows:", data?.length ?? 0, error ? `error: ${error.message}` : "");

      if (error) throw error;
      return ((data as any[]) || []).map((p) => ({
        ...p,
        amenities: (p.amenities as string[]) || [],
        is_paused: !!p.is_paused,
      })) as BrowseProperty[];
    },
    enabled: !!user,
  });
}
