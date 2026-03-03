import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { landlord_user_id, tenant_name, property_name, unit_number, lease_start, lease_end } = await req.json();

    if (!landlord_user_id || !tenant_name || !property_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get landlord's email using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: landlordProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", landlord_user_id)
      .single();

    if (!landlordProfile?.email) {
      return new Response(
        JSON.stringify({ success: true, message: "No landlord email found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">📋 Lease Agreement Signed</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Hello ${landlordProfile.full_name || "Landlord"},</p>
          <p>A tenant has signed a lease agreement for one of your properties and is awaiting your counter-signature.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Tenant:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tenant_name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Property:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${property_name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Unit:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${unit_number}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Lease Period:</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lease_start} to ${lease_end}</td></tr>
          </table>
          <p>Please log in to your dashboard to review and counter-sign the agreement.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This is an automated notification from PropManage.</p>
        </div>
      </div>`;

    const emailResponse = await resend.emails.send({
      from: "PropManage <onboarding@resend.dev>",
      to: [landlordProfile.email],
      subject: `📋 Lease Agreement Signed by ${tenant_name} — Action Required`,
      html: htmlContent,
    });

    console.log("Landlord notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending landlord notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
