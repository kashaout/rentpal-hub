import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatCurrency";
import { TenantLeaseInfo } from "@/hooks/useTenantPortal";

interface Props {
  lease: TenantLeaseInfo;
}

export function TenantLeaseTab({ lease }: Props) {
  const { user } = useAuth();

  const { data: agreements, isLoading } = useQuery({
    queryKey: ["tenant-lease-agreements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_agreements")
        .select("*")
        .eq("tenant_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Current lease summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Current Lease</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">{lease.property_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="font-medium">{lease.unit_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">{format(new Date(lease.lease_start), "MMM d, yyyy")} – {format(new Date(lease.lease_end), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium">{formatCurrency(lease.rent_amount, "NGN")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreements */}
      {agreements && agreements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Lease Agreements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agreements.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Unit {a.unit_number} – {formatCurrency(Number(a.rent_amount), a.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.lease_start), "MMM d, yyyy")} – {format(new Date(a.lease_end), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{a.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    T:{a.tenant_signed ? "✓" : "✗"} L:{a.landlord_signed ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
