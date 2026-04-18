// Tenant AI Help — answers FAQ for the tenant's active lease/property.
// Falls back to "Call Landlord" when it cannot answer.
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData } = await supabaseAnon.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!authData.user) throw new Error("Unauthenticated");

    const { messages } = await req.json();
    if (!Array.isArray(messages)) throw new Error("messages array required");

    // Pull tenant context (active lease + property + landlord phone)
    const { data: tenancy } = await supabaseAnon
      .from("active_tenants" as any)
      .select("lease_id, property_id, landlord_user_id, lease_start, lease_end")
      .eq("tenant_user_id", authData.user.id)
      .order("lease_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    let propertyName = "your property";
    let propertyAddress = "";
    let landlordPhone: string | null = null;
    let landlordName: string | null = null;

    if (tenancy) {
      const t = tenancy as any;
      const { data: prop } = await supabaseAnon
        .from("properties")
        .select("name, address, house_rules, amenities")
        .eq("id", t.property_id)
        .maybeSingle();
      if (prop) {
        propertyName = (prop as any).name ?? propertyName;
        propertyAddress = (prop as any).address ?? "";
      }
      const { data: landlordProfile } = await supabaseAnon
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", t.landlord_user_id)
        .maybeSingle();
      if (landlordProfile) {
        landlordPhone = (landlordProfile as any).phone ?? null;
        landlordName = (landlordProfile as any).full_name ?? null;
      }
    }

    const systemPrompt = `You are RentPal Tenant Assistant — a friendly support agent for tenants in Nigeria.
You help with questions about the tenant's lease, rent payments, maintenance requests, WiFi/door codes, and house rules.

CURRENT TENANT CONTEXT:
- Active property: ${propertyName}${propertyAddress ? " (" + propertyAddress + ")" : ""}
- Landlord: ${landlordName ?? "Unknown"}
- Landlord phone available: ${landlordPhone ? "yes" : "no"}

GUIDELINES:
- Keep replies short, warm, and actionable (2-4 sentences).
- For rent payments → tell them to use the "Pay Rent" button on Dashboard or Payments tab.
- For maintenance issues → tell them to use "Raise Issue" in the sidebar (Maintenance Issue).
- For WiFi or door codes → tell them to open the "Lease" tab; codes appear after both parties sign.
- For questions outside this scope (legal advice, disputes, refunds), respond with EXACTLY:
  "I can't help with that one — please contact your landlord directly."
- Never invent answers about the lease terms. If unsure, recommend contacting the landlord.
- Never expose the landlord's phone number in your reply (the UI shows a Call button separately).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const aiJson = await aiResp.json();
    const reply: string =
      aiJson.choices?.[0]?.message?.content ??
      "I can't help with that one — please contact your landlord directly.";

    const cantAnswer = /can.?t help with that one/i.test(reply);

    return new Response(
      JSON.stringify({
        reply,
        cantAnswer,
        landlordPhone,
        landlordName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("tenant-help-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
