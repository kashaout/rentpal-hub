import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";
import { useLandlordLifecycle } from "@/hooks/lifecycle/useLandlordLifecycle";

export interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  monthly_rent: number;
  image_url: string | null;
  landlord_id: string | null;
  created_at: string;
  updated_at: string;
  currency: string;
  region: string;
  property_type: string;
  listing_type: string;
  description: string | null;
  amenities: string[];
  acquisition_cost: number | null;
  current_value: number | null;
  annual_expenses: number | null;
  is_public: boolean;
}

export interface PropertyWithStats extends Property {
  occupied_units: number;
}

export interface CreatePropertyData {
  name: string;
  address: string;
  units: number;
  monthly_rent: number;
  image_url?: string;
  listing_type?: string;
  description?: string;
  amenities?: string[];
  is_public?: boolean;
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  id: string;
}

/**
 * THIN ADAPTER over useLandlordLifecycle.
 * All read-side property data flows through the canonical chain
 * (properties → bookings → leases). Mutations stay direct.
 */
export function useProperties() {
  const lc = useLandlordLifecycle();

  const data = useMemo<PropertyWithStats[]>(() => {
    return lc.properties.map((p) => {
      const occupied = new Set(
        lc.tenants
          .filter((t) => t.property_id === p.property_id && (t.fully_signed || t.payment_status === "paid"))
          .map((t) => t.tenant_user_id ?? t.id)
      ).size;
      return {
        id: p.property_id,
        name: p.property_name,
        address: p.property_address,
        units: p.units,
        monthly_rent: p.monthly_rent,
        image_url: p.property_image,
        landlord_id: p.landlord_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
        currency: p.currency,
        region: p.region,
        property_type: p.property_type,
        listing_type: p.listing_type,
        description: p.description,
        amenities: p.amenities,
        acquisition_cost: p.acquisition_cost,
        current_value: p.current_value,
        annual_expenses: p.annual_expenses,
        is_public: p.is_public,
        occupied_units: occupied,
      } as PropertyWithStats;
    });
  }, [lc.properties, lc.tenants]);

  return { data, isLoading: lc.isLoading, isError: lc.isError } as ReturnType<
    typeof useQuery<PropertyWithStats[]>
  >;
}

/**
 * Single property — derives from the lifecycle properties list, then falls
 * back to a direct fetch for additional fields (description/amenities/etc.)
 * that the lifecycle summary doesn't expose. The fallback fetch is the only
 * permitted direct read and is per-property.
 */
export function useProperty(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        amenities: (data.amenities as unknown as string[]) || [],
        description: data.description as string | null,
        is_public: (data as any).is_public ?? true,
      } as Property;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePropertyData) => {
      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          ...data,
          landlord_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Property created successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create property",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePropertyData) => {
      const { data: property, error } = await supabase
        .from("properties")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return property;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property", variables.id] });
      toast({ title: "Property updated successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update property",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check for active tenants before archiving
      const { count: activeTenants } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("property_id", id)
        .eq("is_archived", false);

      if (activeTenants && activeTenants > 0) {
        throw new Error(`Cannot archive: this property has ${activeTenants} active tenant(s). Please archive or reassign them first.`);
      }

      // Check for open maintenance requests
      const { count: openIssues } = await supabase
        .from("maintenance_requests")
        .select("*", { count: "exact", head: true })
        .eq("property_id", id)
        .in("status", ["pending", "in_progress", "assigned"]);

      if (openIssues && openIssues > 0) {
        throw new Error(`Cannot archive: this property has ${openIssues} open maintenance issue(s). Please resolve them first.`);
      }

      const { error } = await supabase.from("properties").update({ is_archived: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Property archived successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot archive property",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
