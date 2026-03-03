import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    const results = { soft_locks_released: 0, payouts_released: 0, expired_bookings: 0, reconciled: 0 };

    // 1. Release expired soft locks (10-min timeout)
    const { data: expiredLocks } = await supabaseClient
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: "Soft lock expired", updated_at: new Date().toISOString() })
      .eq("is_soft_lock", true)
      .lt("soft_lock_expires_at", new Date().toISOString())
      .eq("status", "pending")
      .select("id");
    results.soft_locks_released = expiredLocks?.length || 0;

    // 2. Release expired unpaid bookings (24h timeout)
    await supabaseClient.rpc("release_expired_bookings");
    
    // 3. Auto-release payouts for completed bookings (24h after checkout, no disputes)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: completedBookings } = await supabaseClient
      .from("bookings")
      .select("id, property_id")
      .eq("status", "confirmed")
      .eq("payout_status", "pending")
      .eq("payment_status", "paid")
      .lte("check_out", yesterday);

    for (const booking of completedBookings || []) {
      // Check no active disputes
      const { data: disputes } = await supabaseClient
        .from("disputes")
        .select("id")
        .eq("booking_id", booking.id)
        .in("status", ["open", "under_review"]);

      if (!disputes || disputes.length === 0) {
        try {
          // Release payout via the edge function logic inline
          const { data: escrowTxn } = await supabaseClient
            .from("escrow_transactions")
            .select("*")
            .eq("booking_id", booking.id)
            .eq("transaction_type", "capture")
            .eq("status", "completed")
            .single();

          if (escrowTxn && escrowTxn.stripe_payment_intent_id) {
            try {
              await stripe.paymentIntents.capture(escrowTxn.stripe_payment_intent_id);
            } catch { /* already captured */ }

            await supabaseClient.from("escrow_transactions").insert({
              booking_id: booking.id,
              property_id: escrowTxn.property_id,
              tenant_user_id: escrowTxn.tenant_user_id,
              landlord_user_id: escrowTxn.landlord_user_id,
              amount: escrowTxn.amount,
              currency: escrowTxn.currency,
              transaction_type: "release",
              status: "completed",
              stripe_payment_intent_id: escrowTxn.stripe_payment_intent_id,
              description: `Auto payout release for booking ${booking.id}`,
              processed_at: new Date().toISOString(),
            });

            await supabaseClient.from("bookings")
              .update({ payout_status: "released", payout_released_at: new Date().toISOString(), status: "completed" })
              .eq("id", booking.id);

            results.payouts_released++;
          }
        } catch (e) {
          console.error(`Failed to release payout for booking ${booking.id}:`, e);
        }
      }
    }

    // 4. Reconcile pending escrow transactions with Stripe
    const { data: pendingEscrows } = await supabaseClient
      .from("escrow_transactions")
      .select("id, stripe_payment_intent_id, status")
      .eq("status", "pending")
      .not("stripe_payment_intent_id", "is", null)
      .limit(50);

    for (const escrow of pendingEscrows || []) {
      try {
        const pi = await stripe.paymentIntents.retrieve(escrow.stripe_payment_intent_id!);
        let newStatus = escrow.status;
        if (pi.status === "succeeded" || pi.status === "requires_capture") newStatus = "completed";
        else if (pi.status === "canceled") newStatus = "cancelled";

        if (newStatus !== escrow.status) {
          await supabaseClient.from("escrow_transactions")
            .update({ status: newStatus, processed_at: new Date().toISOString() })
            .eq("id", escrow.id);
          results.reconciled++;
        }
      } catch { /* skip failed lookups */ }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
