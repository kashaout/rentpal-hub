import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Review {
  id: string;
  booking_id: string | null;
  property_id: string;
  reviewer_id: string;
  reviewee_id: string | null;
  review_type: string;
  overall_rating: number;
  cleanliness_rating: number | null;
  communication_rating: number | null;
  location_rating: number | null;
  value_rating: number | null;
  issue_resolution_rating: number | null;
  comment: string | null;
  is_public: boolean;
  created_at: string;
  review_window_closes_at: string | null;
  // Joined
  reviewer_name?: string;
  property_name?: string;
}

export function usePropertyReviews(propertyId: string) {
  return useQuery({
    queryKey: ["reviews", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("property_id", propertyId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Review[];
    },
    enabled: !!propertyId,
  });
}

export function useMyReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .or(`reviewer_id.eq.${user!.id},reviewee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Review[];
    },
    enabled: !!user,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      booking_id?: string;
      property_id: string;
      reviewee_id?: string;
      review_type: string;
      overall_rating: number;
      cleanliness_rating?: number;
      communication_rating?: number;
      location_rating?: number;
      value_rating?: number;
      issue_resolution_rating?: number;
      comment?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          ...input,
          reviewer_id: user.id,
          review_window_closes_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      toast.success("Review submitted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });
}
