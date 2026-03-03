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

    const { booking_id, property_id, landlord_user_id, amount, currency } = await req.json();
    if (!booking_id || !property_id || !amount) throw new Error("Missing required fields");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const validCurrency = (currency || "ngn").toLowerCase();
    const amountInMinorUnits = Math.round(amount * 100);

    // Create a PaymentIntent with capture_method manual for escrow hold
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInMinorUnits,
      currency: validCurrency,
      capture_method: "manual",
      metadata: {
        booking_id,
        property_id,
        tenant_user_id: user.id,
        landlord_user_id: landlord_user_id || "",
        type: "escrow_capture",
      },
    });

    // Record escrow transaction
    await supabaseClient.from("escrow_transactions").insert({
      booking_id,
      property_id,
      tenant_user_id: user.id,
      landlord_user_id: landlord_user_id || user.id,
      amount,
      currency: validCurrency.toUpperCase(),
      transaction_type: "capture",
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
      description: `Escrow capture for booking ${booking_id}`,
      created_by: user.id,
    });

    // Update booking payment status
    await supabaseClient.from("bookings")
      .update({ payment_status: "processing" })
      .eq("id", booking_id);

    return new Response(JSON.stringify({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
