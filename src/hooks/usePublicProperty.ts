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
      const { data, error } = await supabase
        .from("public_property_listings" as any)
        .select("id, name, address, description, image_url, property_type, listing_type, monthly_rent, currency, units, region, amenities")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        amenities: ((data as any).amenities as string[]) || [],
      } as BrowseProperty;
    },
    enabled: !!user && !!id,
  });
}
