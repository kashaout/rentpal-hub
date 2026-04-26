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

export function useProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get tenant counts for each property
      const propertiesWithStats: PropertyWithStats[] = await Promise.all(
        (properties || []).map(async (property) => {
          const { count } = await supabase
            .from("tenants")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id);

          return {
            ...property,
            amenities: (property.amenities as unknown as string[]) || [],
            description: property.description as string | null,
            is_public: (property as any).is_public ?? true,
            occupied_units: count || 0,
          } as PropertyWithStats;
        })
      );

      return propertiesWithStats;
    },
    enabled: !!user,
  });
}

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
