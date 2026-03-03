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
    const authHeader = req.headers.get("Authorization");
    // Allow both authenticated calls and cron calls
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id || null;
    }

    const { booking_id } = await req.json();

    // Get escrow transaction for this booking
    const { data: escrowTxn, error: escrowErr } = await supabaseClient
      .from("escrow_transactions")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("transaction_type", "capture")
      .eq("status", "completed")
      .single();

    if (escrowErr || !escrowTxn) throw new Error("No completed escrow capture found for this booking");

    // Check for active disputes
    const { data: disputes } = await supabaseClient
      .from("disputes")
      .select("id, status, payout_frozen")
      .eq("booking_id", booking_id)
      .in("status", ["open", "under_review"]);

    if (disputes && disputes.length > 0 && disputes.some((d: any) => d.payout_frozen)) {
      throw new Error("Cannot release payout: active dispute with frozen payout");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Capture the held payment intent
    if (escrowTxn.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.capture(escrowTxn.stripe_payment_intent_id);
      } catch (stripeErr: any) {
        // If already captured, continue
        if (!stripeErr.message?.includes("already been captured")) throw stripeErr;
      }
    }

    // Record release transaction
    await supabaseClient.from("escrow_transactions").insert({
      booking_id,
      property_id: escrowTxn.property_id,
      tenant_user_id: escrowTxn.tenant_user_id,
      landlord_user_id: escrowTxn.landlord_user_id,
      amount: escrowTxn.amount,
      currency: escrowTxn.currency,
      transaction_type: "release",
      status: "completed",
      stripe_payment_intent_id: escrowTxn.stripe_payment_intent_id,
      description: `Payout released for booking ${booking_id}`,
      created_by: userId,
      processed_at: new Date().toISOString(),
    });

    // Update booking payout status
    await supabaseClient.from("bookings")
      .update({ payout_status: "released", payout_released_at: new Date().toISOString() })
      .eq("id", booking_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
