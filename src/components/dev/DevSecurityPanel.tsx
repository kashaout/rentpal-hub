import { useEffect, useState } from "react";
import { ShieldAlert, X, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SecurityEvent {
  id: string;
  event_type: string;
  table_name: string;
  action: string;
  user_id: string | null;
  ip_address: string | null;
  details: any;
  created_at: string;
}

/**
 * Dev-only floating panel — visible to admins in non-production builds.
 * Reads recent rows from public.security_events (RLS already restricts to admins)
 * so RLS denials are visible during testing instead of being silently swallowed.
 */
export function DevSecurityPanel() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Hidden in production. import.meta.env.PROD is true in production builds.
  const isProd = import.meta.env.PROD;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_events")
      .select("id, event_type, table_name, action, user_id, ip_address, details, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setEvents(data as unknown as SecurityEvent[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && isAdmin && !isProd) load();
  }, [open, isAdmin, isProd]);

  if (isProd || !isAdmin) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-elevated hover:scale-105 transition"
          title="Dev Security Panel (admins only)"
        >
          <ShieldAlert className="h-4 w-4" />
          Security
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] max-w-[95vw] rounded-2xl border bg-background shadow-elevated">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Dev Security Panel</span>
              <Badge variant="outline" className="text-[10px]">DEV</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={load} disabled={loading} className="h-7 w-7">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[420px]">
            <div className="p-3 space-y-2">
              {events.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No security events recorded.
                </p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={ev.event_type === "rls_denial" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {ev.event_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div><span className="text-muted-foreground">table:</span> <code>{ev.table_name}</code></div>
                    <div><span className="text-muted-foreground">action:</span> <code>{ev.action}</code></div>
                    <div className="col-span-2 truncate"><span className="text-muted-foreground">user:</span> <code>{ev.user_id ?? "anon"}</code></div>
                  </div>
                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <pre className="mt-1 max-h-24 overflow-auto rounded bg-background/60 p-1.5 text-[10px] leading-tight">
                      {JSON.stringify(ev.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}
