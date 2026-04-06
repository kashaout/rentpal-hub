import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  propertyId: string;
}

const statusColors: Record<string, string> = {
  open: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground",
};

export function TenantCommunicationTab({ propertyId }: Props) {
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["tenant-communication", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*")
        .eq("tenant_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!requests?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No communication history yet.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Requests & Communication</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.subject}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{r.category}</Badge>
                <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{r.message}</p>
            {r.landlord_response && (
              <div className="rounded-md bg-muted/50 p-3 mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Landlord Response</p>
                <p className="text-sm">{r.landlord_response}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
