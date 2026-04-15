import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let totalAlerts = 0;

    // 1. Fetch all enabled automation workflows
    const { data: workflows, error: wfErr } = await supabase
      .from("automation_workflows")
      .select("*")
      .eq("is_enabled", true);

    if (wfErr) throw wfErr;
    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled workflows", alerts_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group workflows by type for efficient processing
    const workflowsByType: Record<string, typeof workflows> = {};
    for (const wf of workflows) {
      if (!workflowsByType[wf.workflow_type]) {
        workflowsByType[wf.workflow_type] = [];
      }
      workflowsByType[wf.workflow_type].push(wf);
    }

    // Helper: insert alert if not already existing for this workflow+tenant/property today
    async function createAlert(
      workflow: any,
      title: string,
      message: string,
      severity: string,
      propertyId?: string,
      tenantId?: string
    ) {
      // Check for duplicate alert today
      const { data: existing } = await supabase
        .from("workflow_alerts")
        .select("id")
        .eq("workflow_id", workflow.id)
        .eq("user_id", workflow.user_id)
        .eq("title", title)
        .gte("triggered_at", today + "T00:00:00Z")
        .limit(1);

      if (existing && existing.length > 0) return false;

      const { error } = await supabase.from("workflow_alerts").insert({
        workflow_id: workflow.id,
        user_id: workflow.user_id,
        property_id: propertyId || null,
        tenant_id: tenantId || null,
        alert_type: workflow.workflow_type,
        title,
        message,
        severity,
      });

      if (error) {
        console.error("Failed to create alert:", error);
        return false;
      }
      return true;
    }

    // ── OVERDUE RENT ──
    if (workflowsByType["overdue_rent"]) {
      for (const wf of workflowsByType["overdue_rent"]) {
        const daysOverdue = wf.trigger_config?.days_overdue ?? 3;

        // Find tenants with overdue payment status owned by this user's properties
        const { data: properties } = await supabase
          .from("properties")
          .select("id, name")
          .eq("landlord_id", wf.user_id);

        if (!properties || properties.length === 0) continue;

        const propertyIds = properties.map((p: any) => p.id);
        const propertyMap = Object.fromEntries(properties.map((p: any) => [p.id, p.name]));

        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, property_id, unit_number, rent_amount, payment_status")
          .in("property_id", propertyIds)
          .eq("payment_status", "overdue");

        if (!tenants) continue;

        for (const tenant of tenants) {
          // Check last payment date
          const { data: lastPayment } = await supabase
            .from("payments")
            .select("payment_date")
            .eq("tenant_id", tenant.id)
            .order("payment_date", { ascending: false })
            .limit(1);

          let isOverdue = true;
          if (lastPayment && lastPayment.length > 0) {
            const lastDate = new Date(lastPayment[0].payment_date);
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            isOverdue = diffDays >= daysOverdue;
          }

          if (isOverdue) {
            const propName = propertyMap[tenant.property_id] || "Unknown";
            const created = await createAlert(
              wf,
              `Overdue Rent: Unit ${tenant.unit_number}`,
              `Rent is overdue for Unit ${tenant.unit_number} at ${propName}. Amount: ₦${Number(tenant.rent_amount).toLocaleString()}`,
              "warning",
              tenant.property_id,
              tenant.id
            );
            if (created) totalAlerts++;
          }
        }

        // Update last_triggered_at
        await supabase
          .from("automation_workflows")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", wf.id);
      }
    }

    // ── LEASE EXPIRY ──
    if (workflowsByType["lease_expiry"]) {
      for (const wf of workflowsByType["lease_expiry"]) {
        const daysBefore = wf.trigger_config?.days_before ?? 60;

        const { data: properties } = await supabase
          .from("properties")
          .select("id, name")
          .eq("landlord_id", wf.user_id);

        if (!properties || properties.length === 0) continue;

        const propertyIds = properties.map((p: any) => p.id);
        const propertyMap = Object.fromEntries(properties.map((p: any) => [p.id, p.name]));

        // Find tenants with lease ending within daysBefore
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() + daysBefore);
        const cutoffStr = cutoffDate.toISOString().split("T")[0];

        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, property_id, unit_number, lease_end")
          .in("property_id", propertyIds)
          .lte("lease_end", cutoffStr)
          .gte("lease_end", today);

        if (!tenants) continue;

        for (const tenant of tenants) {
          const leaseEnd = new Date(tenant.lease_end);
          const daysLeft = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const propName = propertyMap[tenant.property_id] || "Unknown";
          const severity = daysLeft <= 14 ? "critical" : daysLeft <= 30 ? "warning" : "info";

          const created = await createAlert(
            wf,
            `Lease Expiring: Unit ${tenant.unit_number}`,
            `Lease for Unit ${tenant.unit_number} at ${propName} expires in ${daysLeft} days (${tenant.lease_end})`,
            severity,
            tenant.property_id,
            tenant.id
          );
          if (created) totalAlerts++;
        }

        await supabase
          .from("automation_workflows")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", wf.id);
      }
    }

    // ── COMPLIANCE EXPIRY ──
    if (workflowsByType["compliance_expiry"]) {
      for (const wf of workflowsByType["compliance_expiry"]) {
        const daysBefore = wf.trigger_config?.days_before ?? 30;

        const { data: properties } = await supabase
          .from("properties")
          .select("id, name")
          .eq("landlord_id", wf.user_id);

        if (!properties || properties.length === 0) continue;

        const propertyIds = properties.map((p: any) => p.id);
        const propertyMap = Object.fromEntries(properties.map((p: any) => [p.id, p.name]));

        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() + daysBefore);
        const cutoffStr = cutoffDate.toISOString().split("T")[0];

        const { data: items } = await supabase
          .from("compliance_items")
          .select("id, property_id, name, expiry_date, status")
          .in("property_id", propertyIds)
          .lte("expiry_date", cutoffStr)
          .neq("status", "not_applicable");

        if (!items) continue;

        for (const item of items) {
          const expiryDate = new Date(item.expiry_date);
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const propName = propertyMap[item.property_id] || "Unknown";
          const isExpired = daysLeft < 0;
          const severity = isExpired ? "critical" : daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "warning" : "info";

          const title = isExpired
            ? `Expired: ${item.name}`
            : `Expiring Soon: ${item.name}`;
          const message = isExpired
            ? `${item.name} at ${propName} expired ${Math.abs(daysLeft)} days ago. Immediate action required.`
            : `${item.name} at ${propName} expires in ${daysLeft} days (${item.expiry_date})`;

          const created = await createAlert(wf, title, message, severity, item.property_id);
          if (created) totalAlerts++;
        }

        await supabase
          .from("automation_workflows")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", wf.id);
      }
    }

    // ── LOW OCCUPANCY ──
    if (workflowsByType["low_occupancy"]) {
      for (const wf of workflowsByType["low_occupancy"]) {
        const threshold = wf.trigger_config?.occupancy_threshold ?? 70;

        const { data: properties } = await supabase
          .from("properties")
          .select("id, name, units")
          .eq("landlord_id", wf.user_id);

        if (!properties || properties.length === 0) continue;

        for (const property of properties) {
          const { count } = await supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .eq("property_id", property.id)
            .gte("lease_end", today);

          const occupancy = property.units > 0
            ? Math.round(((count || 0) / property.units) * 100)
            : 0;

          if (occupancy < threshold) {
            const created = await createAlert(
              wf,
              `Low Occupancy: ${property.name}`,
              `${property.name} occupancy is at ${occupancy}% (${count || 0}/${property.units} units). Below ${threshold}% threshold.`,
              occupancy < 50 ? "critical" : "warning",
              property.id
            );
            if (created) totalAlerts++;
          }
        }

        await supabase
          .from("automation_workflows")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", wf.id);
      }
    }

    // ── HIGH MAINTENANCE ──
    if (workflowsByType["high_maintenance"]) {
      for (const wf of workflowsByType["high_maintenance"]) {
        const costThreshold = wf.trigger_config?.cost_threshold ?? 50000;

        const { data: properties } = await supabase
          .from("properties")
          .select("id, name")
          .eq("landlord_id", wf.user_id);

        if (!properties || properties.length === 0) continue;

        // Check maintenance costs in last 30 days
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

        for (const property of properties) {
          const { data: transactions } = await supabase
            .from("financial_transactions")
            .select("amount")
            .eq("property_id", property.id)
            .eq("category", "maintenance")
            .eq("type", "expense")
            .gte("transaction_date", thirtyDaysAgoStr);

          const totalCost = (transactions || []).reduce(
            (sum: number, t: any) => sum + Number(t.amount),
            0
          );

          if (totalCost >= costThreshold) {
            const created = await createAlert(
              wf,
              `High Maintenance Cost: ${property.name}`,
              `${property.name} has ₦${totalCost.toLocaleString()} in maintenance costs over the last 30 days, exceeding the ₦${Number(costThreshold).toLocaleString()} threshold.`,
              totalCost >= costThreshold * 1.5 ? "critical" : "warning",
              property.id
            );
            if (created) totalAlerts++;
          }
        }

        await supabase
          .from("automation_workflows")
          .update({ last_triggered_at: now.toISOString() })
          .eq("id", wf.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily workflow check completed",
        alerts_created: totalAlerts,
        workflows_processed: workflows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Daily workflow check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
