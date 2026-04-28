import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrowseProperty } from "@/hooks/useBrowseProperties";

/**
 * Fetch a single property from the public_property_listings view.
 * Safe for tenants — excludes financial columns.
 */
export function usePublicProperty(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["public-property", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_property_listings" as any, {
        _property_id: id,
      });

      if (error) throw error;
      const d = ((data as any[]) || [])[0];
      if (!d) return null;
      return {
        id: d.id,
        name: d.name,
        address: d.address,
        description: d.description,
        image_url: d.image_url,
        property_type: d.property_type,
        listing_type: d.listing_type,
        monthly_rent: d.monthly_rent,
        currency: d.currency,
        units: d.units,
        region: d.region,
        amenities: (d.amenities as string[]) || [],
        landlord_id: d.landlord_id,
      } as BrowseProperty & { landlord_id: string | null };
    },
    enabled: !!user && !!id,
  });
}
