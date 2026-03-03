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
}

export function useBrowseProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["browse-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, description, image_url, property_type, listing_type, monthly_rent, currency, units, region, amenities")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((p) => ({
        ...p,
        amenities: (p.amenities as string[]) || [],
      })) as BrowseProperty[];
    },
    enabled: !!user,
  });
}
