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
    queryFn: async (): Promise<BrowseProperty[]> => {
      // `_property_id` is optional on the RPC — omitting it returns all listings.
      const { data, error } = await supabase.rpc("get_public_property_listings", {});

      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        description: p.description ?? null,
        image_url: p.image_url ?? null,
        property_type: p.property_type,
        listing_type: p.listing_type,
        monthly_rent: Number(p.monthly_rent ?? 0),
        currency: p.currency,
        units: Number(p.units ?? 0),
        region: p.region,
        amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
        is_paused: !!p.is_paused,
        landlord_business_name: p.landlord_business_name ?? null,
        landlord_name: p.landlord_business_name ?? null,
      }));
    },
    enabled: !!user,
  });
}

