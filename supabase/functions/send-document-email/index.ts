// Send a lease agreement (or any document file) to a recipient by email.
// Uses Resend. Recipient defaults to the requesting user's email.
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userSupabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      subject = "Your document from RentPal",
      htmlBody,
      textBody,
      attachmentBase64,
      attachmentFilename = "document.pdf",
      to,
    } = body ?? {};

    if (!htmlBody && !textBody && !attachmentBase64) {
      return new Response(
        JSON.stringify({ error: "Provide at least one of: htmlBody, textBody, attachmentBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipient = to || userData.user.email;
    if (!recipient) {
      return new Response(JSON.stringify({ error: "No recipient email available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);
    const send = await resend.emails.send({
      from: "RentPal <onboarding@resend.dev>",
      to: [recipient],
      subject,
      html:
        htmlBody ||
        `<p>${(textBody as string)?.replace(/\n/g, "<br/>") ?? "Please find your document attached."}</p>`,
      text: textBody,
      attachments: attachmentBase64
        ? [
            {
              filename: attachmentFilename,
              content: attachmentBase64,
            },
          ]
        : undefined,
    });

    if ((send as any)?.error) {
      console.error("Resend error:", (send as any).error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, recipient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-document-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
