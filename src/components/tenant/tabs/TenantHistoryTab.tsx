import { format } from "date-fns";
import { Loader2, Activity, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  tenantId: string;
  propertyId: string;
}

interface HistoryItem {
  id: string;
  type: string;
  description: string;
  date: string;
  rating?: number;
}

const typeColors: Record<string, string> = {
  Payment: "bg-success/10 text-success border-success/20",
  Maintenance: "bg-warning/10 text-warning border-warning/20",
  Lease: "bg-primary/10 text-primary border-primary/20",
  Request: "bg-accent/10 text-accent border-accent/20",
  Review: "bg-secondary text-secondary-foreground border-secondary",
};

export function TenantHistoryTab({ tenantId }: Props) {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ["tenant-history", tenantId],
    queryFn: async () => {
      const items: HistoryItem[] = [];

      // Payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, status, payment_date, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(15);
      payments?.forEach(p => items.push({
        id: `py-${p.id}`, type: "Payment", description: `₦${Number(p.amount).toLocaleString()} – ${p.status}`, date: p.created_at,
      }));

      // Maintenance requests
      const { data: requests } = await supabase
        .from("maintenance_requests")
        .select("id, title, status, rating, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      requests?.forEach(r => items.push({
        id: `mr-${r.id}`, type: "Maintenance", description: `${r.title} (${r.status})`, date: r.created_at, rating: r.rating || undefined,
      }));

      if (user?.id) {
        // Lease agreements
        const { data: leases } = await supabase
          .from("lease_agreements")
          .select("id, status, created_at, unit_number")
          .eq("tenant_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        leases?.forEach(l => items.push({
          id: `la-${l.id}`, type: "Lease", description: `Unit ${l.unit_number} – ${l.status}`, date: l.created_at,
        }));

        // Tenant requests
        const { data: tRequests } = await supabase
          .from("tenant_requests")
          .select("id, subject, status, created_at")
          .eq("tenant_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        tRequests?.forEach(r => items.push({
          id: `tr-${r.id}`, type: "Request", description: `${r.subject} (${r.status})`, date: r.created_at,
        }));

        // Reviews
        const { data: reviews } = await supabase
          .from("reviews")
          .select("id, overall_rating, comment, review_type, created_at")
          .eq("reviewer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        reviews?.forEach(r => items.push({
          id: `rv-${r.id}`, type: "Review", description: `${r.review_type} review – ${r.overall_rating}/5${r.comment ? `: "${r.comment.slice(0, 60)}"` : ""}`, date: r.created_at, rating: r.overall_rating,
        }));
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items.slice(0, 40);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!history?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No history to display yet.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[item.type] || ""}`}>{item.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              {item.rating && (
                <div className="flex items-center gap-1 text-xs shrink-0">
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  {item.rating}/5
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
