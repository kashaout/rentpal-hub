import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildArchiveWarning, type ArchiveCheckResult } from "@/lib/permissions";

export function usePropertyArchiveCheck(propertyId: string | null) {
  return useQuery({
    queryKey: ["archive-check", "property", propertyId],
    queryFn: async (): Promise<ArchiveCheckResult> => {
      if (!propertyId) return { canArchive: false, reason: "No property selected." };

      const [tenants, leases, issues, workOrders, payments] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("property_id", propertyId).eq("is_archived", false),
        supabase.from("lease_agreements").select("*", { count: "exact", head: true }).eq("property_id", propertyId).in("status", ["draft", "active", "pending"]),
        supabase.from("maintenance_requests").select("*", { count: "exact", head: true }).eq("property_id", propertyId).in("status", ["pending", "in_progress", "assigned"]),
        supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("property_id", propertyId).in("status", ["created", "assigned", "in_progress"]),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("property_id", propertyId).eq("status", "pending"),
      ]);

      return buildArchiveWarning("property", {
        "active tenants": tenants.count || 0,
        "active leases": leases.count || 0,
        "open issues": issues.count || 0,
        "open work orders": workOrders.count || 0,
        "pending payments": payments.count || 0,
      });
    },
    enabled: !!propertyId,
  });
}

export function useTenantArchiveCheck(tenantId: string | null) {
  return useQuery({
    queryKey: ["archive-check", "tenant", tenantId],
    queryFn: async (): Promise<ArchiveCheckResult> => {
      if (!tenantId) return { canArchive: false, reason: "No tenant selected." };

      const [issues, payments] = await Promise.all([
        supabase.from("maintenance_requests").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["pending", "in_progress", "assigned"]),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending"),
      ]);

      return buildArchiveWarning("tenant", {
        "open issues": issues.count || 0,
        "pending payments": payments.count || 0,
      });
    },
    enabled: !!tenantId,
  });
}
