import { format } from "date-fns";
import { Loader2, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  propertyId: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
}

export function PropertyActivityTab({ propertyId }: Props) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ["property-activity", propertyId],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      // Recent maintenance requests
      const { data: requests } = await supabase
        .from("maintenance_requests")
        .select("id, title, status, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(10);
      requests?.forEach(r => items.push({
        id: `mr-${r.id}`, type: "Maintenance", description: `${r.title} (${r.status})`, date: r.created_at,
      }));

      // Recent lease activity
      const { data: leases } = await supabase
        .from("lease_agreements")
        .select("id, tenant_name, status, created_at, updated_at")
        .eq("property_id", propertyId)
        .order("updated_at", { ascending: false })
        .limit(10);
      leases?.forEach(l => items.push({
        id: `la-${l.id}`, type: "Lease", description: `${l.tenant_name} – ${l.status}`, date: l.updated_at || l.created_at,
      }));

      // Recent payments via tenants
      const { data: tenants } = await supabase.from("tenants").select("id").eq("property_id", propertyId);
      if (tenants?.length) {
        const { data: payments } = await supabase
          .from("payments")
          .select("id, amount, status, payment_date, created_at")
          .in("tenant_id", tenants.map(t => t.id))
          .order("created_at", { ascending: false })
          .limit(10);
        payments?.forEach(p => items.push({
          id: `py-${p.id}`, type: "Payment", description: `₦${Number(p.amount).toLocaleString()} – ${p.status}`, date: p.created_at,
        }));
      }

      // Recent compliance changes
      const { data: compliance } = await supabase
        .from("compliance_items")
        .select("id, name, status, updated_at")
        .eq("property_id", propertyId)
        .order("updated_at", { ascending: false })
        .limit(5);
      compliance?.forEach(c => items.push({
        id: `ci-${c.id}`, type: "Compliance", description: `${c.name} – ${c.status}`, date: c.updated_at,
      }));

      // Sort all by date desc
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items.slice(0, 30);
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!activity?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No recent activity for this property.</CardContent></Card>;
  }

  const typeColors: Record<string, string> = {
    Maintenance: "bg-warning/10 text-warning border-warning/20",
    Lease: "bg-primary/10 text-primary border-primary/20",
    Payment: "bg-success/10 text-success border-success/20",
    Compliance: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[item.type] || ""}`}>{item.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
