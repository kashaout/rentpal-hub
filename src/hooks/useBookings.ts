import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";
import { applyPricingRules } from "@/lib/pricing/applyPricingRules";

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
  is_soft_lock: boolean;
  soft_lock_expires_at: string | null;
  payout_status: string | null;
  payout_released_at: string | null;
  cancellation_reason: string | null;
  original_price?: number | null;
  discount_amount?: number | null;
  final_price?: number | null;
  pricing_rule_id?: string | null;
}

export interface CreateBookingData {
  property_id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  guest_count?: number;
  notes?: string;
  /** Optional pricing-engine inputs. If landlord_id is provided, pricing rules
   *  are evaluated server-side at insert time and a write-once snapshot
   *  (original_price/discount_amount/final_price/pricing_rule_id) is recorded. */
  landlord_id?: string;
  promo_code?: string | null;
  months?: number | null;
  nights?: number | null;
}

/** Internal: compute pricing snapshot for a booking insert. Falls back to
 *  no-discount if landlord_id is missing or rules cannot be read. */
async function buildPricingSnapshot(data: CreateBookingData) {
  if (!data.landlord_id) {
    return {
      original_price: data.total_price,
      discount_amount: 0,
      final_price: data.total_price,
      pricing_rule_id: null as string | null,
    };
  }
  const result = await applyPricingRules({
    property_id: data.property_id,
    landlord_id: data.landlord_id,
    base_price: data.total_price,
    promo_code: data.promo_code ?? null,
    months: data.months ?? null,
    nights: data.nights ?? null,
  });
  return {
    original_price: result.original_price,
    discount_amount: result.discount_amount,
    final_price: result.final_price,
    pricing_rule_id: result.rule_id,
  };
}

export function usePropertyBookings(propertyId: string) {
  return useQuery({
    queryKey: ["bookings", propertyId],
    queryFn: async () => {
      // Release expired soft locks and bookings
      await supabase.rpc("release_expired_bookings");
      await supabase.rpc("release_soft_locks");

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

/** Create a soft-lock booking (10-min hold on dates) */
export function useSoftLockBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const softLockExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const snap = await buildPricingSnapshot(data);
      const { landlord_id, promo_code, months, nights, ...insertData } = data;

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          ...insertData,
          total_price: snap.final_price,
          original_price: snap.original_price,
          discount_amount: snap.discount_amount,
          final_price: snap.final_price,
          pricing_rule_id: snap.pricing_rule_id,
          user_id: user!.id,
          is_soft_lock: true,
          soft_lock_expires_at: softLockExpires,
          status: "pending",
          payment_status: "unpaid",
        })
        .select()
        .single();

      if (error) throw error;
      return booking as unknown as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", variables.property_id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast({ title: "Dates reserved! Complete payment within 10 minutes." });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reserve dates",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const snap = await buildPricingSnapshot(data);
      const { landlord_id, promo_code, months, nights, ...insertData } = data;
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          ...insertData,
          total_price: snap.final_price,
          original_price: snap.original_price,
          discount_amount: snap.discount_amount,
          final_price: snap.final_price,
          pricing_rule_id: snap.pricing_rule_id,
          user_id: user!.id,
        })
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
        .update({ status: "cancelled" })
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
