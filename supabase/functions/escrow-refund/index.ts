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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("Not authenticated");

    const { booking_id, amount, reason, severity } = await req.json();
    if (!booking_id) throw new Error("Booking ID required");

    // Get escrow capture transaction
    const { data: escrowTxn } = await supabaseClient
      .from("escrow_transactions")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("transaction_type", "capture")
      .in("status", ["completed", "pending"])
      .single();

    if (!escrowTxn) throw new Error("No escrow capture found");

    // Calculate refund amount using compensation formula if severity provided
    let refundAmount = amount;
    if (!refundAmount && severity) {
      const { data: compensation } = await supabaseClient
        .rpc("calculate_compensation", { _booking_id: booking_id, _severity: severity });
      if (compensation && compensation.length > 0) {
        refundAmount = compensation[0].refund_amount;
      }
    }
    if (!refundAmount) refundAmount = escrowTxn.amount;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Cancel or refund the payment intent
    let stripeRefundId: string | null = null;
    if (escrowTxn.stripe_payment_intent_id) {
      try {
        // Try to cancel uncaptured payment
        await stripe.paymentIntents.cancel(escrowTxn.stripe_payment_intent_id);
      } catch {
        // If already captured, create a refund
        try {
          const refund = await stripe.refunds.create({
            payment_intent: escrowTxn.stripe_payment_intent_id,
            amount: Math.round(refundAmount * 100),
            reason: "requested_by_customer",
          });
          stripeRefundId = refund.id;
        } catch (refundErr: any) {
          throw new Error(`Stripe refund failed: ${refundErr.message}`);
        }
      }
    }

    // Record refund escrow transaction
    await supabaseClient.from("escrow_transactions").insert({
      booking_id,
      property_id: escrowTxn.property_id,
      tenant_user_id: escrowTxn.tenant_user_id,
      landlord_user_id: escrowTxn.landlord_user_id,
      amount: refundAmount,
      currency: escrowTxn.currency,
      transaction_type: "refund",
      status: "completed",
      stripe_payment_intent_id: escrowTxn.stripe_payment_intent_id,
      reference_id: stripeRefundId,
      description: reason || `Refund for booking ${booking_id} (severity: ${severity || "N/A"})`,
      created_by: user.id,
      processed_at: new Date().toISOString(),
    });

    // Update booking
    await supabaseClient.from("bookings")
      .update({ payment_status: "refunded", payout_status: "cancelled" })
      .eq("id", booking_id);

    return new Response(JSON.stringify({ success: true, refund_amount: refundAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
