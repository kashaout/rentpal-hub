import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface Booking {
  id: string;
  property_id: string;
  user_id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string;
  payment_status: string;
  guest_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface CreateBookingData {
  property_id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  guest_count?: number;
  notes?: string;
}

export function usePropertyBookings(propertyId: string) {
  return useQuery({
    queryKey: ["bookings", propertyId],
    queryFn: async () => {
      // First release any expired bookings
      await supabase.rpc("release_expired_bookings" as any);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", propertyId)
        .in("status", ["pending", "confirmed"])
        .order("check_in", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Booking[];
    },
    enabled: !!propertyId,
  });
}

export function useMyBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Booking[];
    },
    enabled: !!user,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          ...data,
          user_id: user!.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return booking as unknown as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", variables.property_id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast({ title: "Booking created! Please complete payment within 24 hours." });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create booking",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast({ title: "Booking cancelled." });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel booking",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
