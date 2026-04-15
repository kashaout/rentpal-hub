import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate cron/scheduled calls via shared secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const results = { sla_breaches: 0, repeat_issues: 0, unassigned_escalated: 0 };
    const now = new Date();

    // 1. SLA breach detection - work orders past their deadlines
    const { data: breachedOrders } = await supabaseClient
      .from("work_orders")
      .select("id, property_id, severity, sla_response_deadline, sla_resolution_deadline, sla_response_met, sla_resolution_met, status, assigned_to")
      .not("status", "in", '("closed","verified","completed")')
      .or(`sla_response_deadline.lt.${now.toISOString()},sla_resolution_deadline.lt.${now.toISOString()}`);

    for (const wo of breachedOrders || []) {
      const responseBreach = wo.sla_response_deadline && new Date(wo.sla_response_deadline) < now && wo.sla_response_met === null;
      const resolutionBreach = wo.sla_resolution_deadline && new Date(wo.sla_resolution_deadline) < now && wo.sla_resolution_met === null;

      if (responseBreach || resolutionBreach) {
        // Update SLA flags
        const updates: any = {};
        if (responseBreach) updates.sla_response_met = false;
        if (resolutionBreach) updates.sla_resolution_met = false;
        await supabaseClient.from("work_orders").update(updates).eq("id", wo.id);

        // Log breach
        await supabaseClient.from("maintenance_logs").insert({
          work_order_id: wo.id,
          action: "sla_breach",
          details: `SLA ${responseBreach ? "response" : "resolution"} deadline breached for ${wo.severity} severity work order`,
        });

        // Affect technician performance
        if (wo.assigned_to) {
          await supabaseClient.rpc("update_technician_performance" as any, { _user_id: wo.assigned_to }).catch(() => {});
        }

        // Notify landlord of the property
        const { data: prop } = await supabaseClient.from("properties").select("landlord_id, name").eq("id", wo.property_id).single();
        if (prop?.landlord_id) {
          await supabaseClient.from("landlord_notifications").insert({
            landlord_user_id: prop.landlord_id,
            tenant_user_id: prop.landlord_id, // self-notification for escalation
            notification_type: "sla_breach",
            title: `SLA Breach: ${prop.name}`,
            message: `A ${wo.severity} severity work order has breached its ${responseBreach ? "response" : "resolution"} SLA deadline. Immediate attention required.`,
            property_id: wo.property_id,
          });
        }

        results.sla_breaches++;
      }
    }

    // 2. Detect unassigned work orders past response deadline - auto-escalate
    const { data: unassigned } = await supabaseClient
      .from("work_orders")
      .select("id, property_id")
      .eq("status", "created")
      .is("assigned_to", null)
      .lt("sla_response_deadline", now.toISOString());

    for (const wo of unassigned || []) {
      // Try auto-dispatch
      await supabaseClient.rpc("auto_dispatch_work_order", { _work_order_id: wo.id }).catch(() => {});
      results.unassigned_escalated++;
    }

    // 3. Repeat issue detection (3+ issues in 60 days for same property)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: repeatIssues } = await supabaseClient
      .from("maintenance_requests")
      .select("property_id")
      .gte("created_at", sixtyDaysAgo);

    if (repeatIssues) {
      const countByProperty: Record<string, number> = {};
      repeatIssues.forEach((r: any) => { countByProperty[r.property_id] = (countByProperty[r.property_id] || 0) + 1; });
      
      for (const [propId, count] of Object.entries(countByProperty)) {
        if (count >= 3) {
          const { data: prop } = await supabaseClient.from("properties").select("landlord_id, name").eq("id", propId).single();
          if (prop?.landlord_id) {
            // Check if we already notified recently
            const { data: existing } = await supabaseClient.from("landlord_notifications")
              .select("id")
              .eq("property_id", propId)
              .eq("notification_type", "repeat_issues")
              .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1);
            
            if (!existing || existing.length === 0) {
              await supabaseClient.from("landlord_notifications").insert({
                landlord_user_id: prop.landlord_id,
                tenant_user_id: prop.landlord_id,
                notification_type: "repeat_issues",
                title: `Repeat Issues: ${prop.name}`,
                message: `${count} maintenance issues reported in the last 60 days. Review recommended.`,
                property_id: propId,
              });
              results.repeat_issues++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
