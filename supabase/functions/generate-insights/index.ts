import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Fetch financial data for analysis
    const [propertiesRes, transactionsRes, tenantsRes, paymentsRes] = await Promise.all([
      supabase.from("properties").select("*"),
      supabase.from("financial_transactions").select("*"),
      supabase.from("tenants").select("*"),
      supabase.from("payments").select("*"),
    ]);

    const properties = propertiesRes.data || [];
    const transactions = transactionsRes.data || [];
    const tenants = tenantsRes.data || [];
    const payments = paymentsRes.data || [];

    // Calculate metrics for AI analysis
    const totalRevenue = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
    const occupiedUnits = tenants.length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const overduePayments = payments.filter((p) => p.status === "overdue").length;
    const paidPayments = payments.filter((p) => p.status === "completed").length;
    const collectionRate = payments.length > 0 ? (paidPayments / payments.length) * 100 : 100;

    // Property-level analysis
    const propertyAnalysis = properties.map((property) => {
      const propTx = transactions.filter((t) => t.property_id === property.id);
      const propRevenue = propTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const propExpenses = propTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const propTenants = tenants.filter((t) => t.property_id === property.id);
      const propOccupancy = property.units > 0 ? (propTenants.length / property.units) * 100 : 0;

      return {
        name: property.name,
        revenue: propRevenue,
        expenses: propExpenses,
        profit: propRevenue - propExpenses,
        occupancy: propOccupancy,
        rent: property.monthly_rent,
      };
    });

    // Build prompt for AI
    const prompt = `You are a Nigerian real estate financial analyst. Analyze this portfolio data and provide 3-5 actionable insights.

PORTFOLIO SUMMARY:
- Total Properties: ${properties.length}
- Total Revenue: ₦${totalRevenue.toLocaleString()}
- Total Expenses: ₦${totalExpenses.toLocaleString()}
- Net Profit: ₦${netProfit.toLocaleString()}
- Occupancy Rate: ${occupancyRate.toFixed(1)}%
- Collection Rate: ${collectionRate.toFixed(1)}%
- Overdue Payments: ${overduePayments}

PROPERTY BREAKDOWN:
${propertyAnalysis.map((p) => `- ${p.name}: Revenue ₦${p.revenue.toLocaleString()}, Expenses ₦${p.expenses.toLocaleString()}, Profit ₦${p.profit.toLocaleString()}, Occupancy ${p.occupancy.toFixed(0)}%`).join("\n")}

Provide insights in JSON format with this structure:
{
  "insights": [
    {
      "type": "cashflow|profitability|risk|opportunity|efficiency",
      "severity": "info|warning|critical|opportunity",
      "title": "Short title",
      "description": "2-3 sentence explanation",
      "actions": ["Action item 1", "Action item 2"]
    }
  ]
}

Focus on:
1. Loss-making or underperforming properties
2. Vacancy risks
3. Collection issues
4. Cost optimization opportunities
5. Revenue growth strategies

Be specific with Nigerian Naira amounts and percentages.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a Nigerian real estate financial analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse AI response
    let insights = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);
      insights = parsed.insights || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      insights = [];
    }

    // Clear old insights and insert new ones
    await supabase
      .from("ai_insights")
      .delete()
      .eq("user_id", userId)
      .eq("is_dismissed", false);

    if (insights.length > 0) {
      const insightRecords = insights.map((insight: any) => ({
        user_id: userId,
        insight_type: insight.type || "general",
        title: insight.title,
        description: insight.description,
        severity: insight.severity || "info",
        action_items: insight.actions || [],
      }));

      await supabase.from("ai_insights").insert(insightRecords);
    }

    return new Response(JSON.stringify({ success: true, count: insights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
