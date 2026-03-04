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
    // Authenticate the user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseAnon.auth.getUser(token);
    if (!authData.user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the Stripe Checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const tenantId = session.metadata?.tenant_id;
    
    if (!tenantId) throw new Error("No tenant ID in session metadata");

    if (session.payment_status === "paid") {
      // Update the pending payment record to completed
      // Find the matching pending payment by tenant_id and session ID in notes
      const { data: pendingPayments } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .ilike("notes", `%${sessionId}%`)
        .limit(1);

      if (pendingPayments && pendingPayments.length > 0) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            notes: `Stripe payment confirmed. Session: ${sessionId}`,
          })
          .eq("id", pendingPayments[0].id);
      } else {
        // No pending record found — insert a completed one (fallback)
        const amountPaid = (session.amount_total || 0) / 100;
        const today = new Date().toISOString().split("T")[0];

        await supabaseAdmin.from("payments").insert({
          tenant_id: tenantId,
          amount: amountPaid,
          payment_date: today,
          due_date: today,
          status: "completed",
          payment_method: "card",
          notes: `Stripe payment confirmed. Session: ${sessionId}`,
        });
      }

      // Update tenant payment_status to "paid"
      await supabaseAdmin
        .from("tenants")
        .update({ payment_status: "paid" })
        .eq("id", tenantId);

      return new Response(
        JSON.stringify({ verified: true, status: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ verified: false, status: session.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Verify rent payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
