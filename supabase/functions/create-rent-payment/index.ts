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

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAnon.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { amount, currency, tenantId, propertyId, propertyName, unitNumber } = await req.json();
    if (!amount || !tenantId) throw new Error("Amount and tenant ID are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const validCurrency = (currency || "ngn").toLowerCase();
    const amountInMinorUnits = Math.round(amount * 100);

    const origin = req.headers.get("origin") || "https://id-preview--171329c0-0821-4377-b783-24da77ae62c5.lovable.app";

    // Include property_id in success URL so we can redirect back to the property
    const successUrl = propertyId
      ? `${origin}/dashboard?rent_payment=success&session_id={CHECKOUT_SESSION_ID}&property_id=${propertyId}`
      : `${origin}/dashboard?rent_payment=success&session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: validCurrency,
            product_data: {
              name: `Rent Payment - ${propertyName || "Property"}`,
              description: unitNumber ? `Unit ${unitNumber}` : undefined,
            },
            unit_amount: amountInMinorUnits,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${origin}/dashboard?rent_payment=canceled`,
      metadata: {
        tenant_id: tenantId,
        property_id: propertyId || "",
        type: "rent_payment",
      },
    });

    // Insert a pending payment record using service role (bypasses RLS)
    const today = new Date().toISOString().split("T")[0];
    const insertData: any = {
      tenant_id: tenantId,
      amount: amount,
      payment_date: today,
      due_date: today,
      status: "pending",
      payment_method: "card",
      notes: `Stripe session: ${session.id}`,
    };
    if (propertyId) {
      insertData.property_id = propertyId;
    }

    const { error: insertError } = await supabaseAdmin
      .from("payments")
      .insert(insertData);

    if (insertError) {
      console.error("Failed to insert pending payment:", insertError);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
