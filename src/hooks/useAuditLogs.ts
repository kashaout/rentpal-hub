import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogWithUser extends AuditLog {
  user_email?: string;
}

interface UseAuditLogsOptions {
  tableName?: string;
  recordId?: string;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { tableName, recordId, limit = 100 } = options;

  return useQuery({
    queryKey: ["audit_logs", tableName, recordId, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      if (recordId) {
        query = query.eq("record_id", recordId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails for the logs
      const userIds = [...new Set((data ?? []).map((log) => log.user_id).filter((id): id is string => !!id))];
      
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);
        
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.email;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return (data || []).map(log => ({
        ...log,
        user_email: log.user_id ? userMap[log.user_id] : undefined,
      })) as AuditLogWithUser[];
    },
  });
}
