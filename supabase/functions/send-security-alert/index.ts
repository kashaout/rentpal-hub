import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  event_type: "admin_role_assigned" | "admin_role_removed" | "payment_modified" | "bulk_payment_change";
  affected_user_id?: string;
  affected_user_email?: string;
  actor_user_id: string;
  details?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a client with the user's token to verify their identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's token
    const { data: userData, error: userError } = await userSupabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authenticatedUserId = userData.user.id;

    // Parse request body
    const { event_type, affected_user_id, affected_user_email, actor_user_id, details }: SecurityAlertRequest = await req.json();

    // Verify the actor_user_id matches the authenticated user
    if (actor_user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: actor_user_id does not match authenticated user" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user has appropriate role for triggering security alerts
    // Admin role changes should only be triggered by admins
    if (event_type === "admin_role_assigned" || event_type === "admin_role_removed") {
      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authenticatedUserId);

      if (roleError) {
        console.error("Error checking user roles:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to verify user permissions" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const isAdmin = userRoles?.some(r => r.role === "admin");
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: only admins can trigger admin role alerts" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Fetch actor's profile
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", actor_user_id)
      .single();

    // Fetch all admin emails
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = adminRoles?.map((r) => r.user_id) || [];

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminUserIds);

    const adminEmails = adminProfiles?.map((p) => p.email).filter(Boolean) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const actorName = actorProfile?.full_name || actorProfile?.email || "Unknown User";
    const affectedEmail = affected_user_email || "Unknown User";
    const timestamp = new Date().toISOString();

    let subject = "";
    let htmlContent = "";

    switch (event_type) {
      case "admin_role_assigned":
        subject = "🔐 Security Alert: Admin Role Assigned";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🔐 Critical Security Event</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #dc2626;">Admin Role Assigned</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Action By:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${actorName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">User Affected:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${affectedEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
                </tr>
              </table>
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                If you did not authorize this action, please review immediately.
              </p>
            </div>
          </div>
        `;
        break;

      case "admin_role_removed":
        subject = "🔐 Security Alert: Admin Role Removed";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🔐 Security Event</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #f59e0b;">Admin Role Removed</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Action By:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${actorName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">User Affected:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${affectedEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
        break;

      case "payment_modified":
        const amount = details?.amount || "N/A";
        const paymentAction = details?.action || "modified";
        subject = "💰 Security Alert: Payment Record Modified";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">💰 Payment Security Event</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #3b82f6;">Payment ${paymentAction}</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Action By:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${actorName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Amount:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">$${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
        break;

      default:
        subject = "🔐 Security Alert";
        htmlContent = `<p>A security event occurred: ${event_type}</p>`;
    }

    // Send to all admins
    const emailResponse = await resend.emails.send({
      from: "Security Alerts <onboarding@resend.dev>",
      to: adminEmails,
      subject,
      html: htmlContent,
    });

    console.log("Security alert emails sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending security alert:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to process security alert" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
