// Public AI Help Chat — answers FAQs about RentPal for unauthenticated visitors.
// Falls back to "Contact Support" when it cannot answer.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_EMAIL = "support@rentpal.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are RentPal's friendly support assistant for the public website.
RentPal is an AI Real Estate Operating System for the Nigerian market (currency: ₦/NGN).

WHAT RENTPAL DOES (use this as your knowledge base):
- For LANDLORDS: manage properties, list standard rentals or Airbnb-style stays, onboard tenants, generate Lagos-State compliant lease agreements, track rent payments, manage maintenance requests via a Kanban board, track compliance, and view financial reports.
- For TENANTS: browse and book properties, sign lease agreements digitally, pay rent securely (via Stripe escrow), submit maintenance requests, message the landlord, and access WiFi/door codes 12 hours before check-in.
- PRICING: Free (1 property), Basic (10 properties), Pro (50 properties + financials), Business (unlimited + automation).
- ONBOARDING: Pay-before-signup. Pick a plan → Stripe checkout → magic-link signup → onboarding wizard.
- SECURITY: Bank-grade encryption, role-based access control, immutable financial records, escrow-based rent.

GUIDELINES:
- Keep replies short, warm, and actionable (2–4 sentences).
- Always answer in the language the user wrote in.
- For account-specific questions (my data, my account, billing changes), respond with EXACTLY:
  "I can't help with that here — please contact our support team."
- For legal advice, refunds, or anything outside RentPal's product scope, respond with the same EXACT line.
- Never invent features or prices. If unsure, recommend contacting support.
- Never expose internal details (Supabase, edge functions, table names).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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
      "I can't help with that here — please contact our support team.";

    const cantAnswer = /can.?t help with (that|this)/i.test(reply);

    return new Response(
      JSON.stringify({ reply, cantAnswer, supportEmail: SUPPORT_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("public-help-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
