import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
  propertyId: string;
}

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground",
};

const methodLabels: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", check: "Check", card: "Card", other: "Other",
};

export function PropertyPaymentsTab({ propertyId }: Props) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["property-payments", propertyId],
    queryFn: async () => {
      // Get tenants for this property first
      const { data: tenants } = await supabase.from("tenants").select("id, user_id, unit_number").eq("property_id", propertyId);
      if (!tenants?.length) return [];
      
      const tenantIds = tenants.map(t => t.id);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("tenant_id", tenantIds)
        .order("payment_date", { ascending: false });
      if (error) throw error;

      // Get tenant names
      const userIds = [...new Set(tenants.map(t => t.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || "Unknown"]));
      }

      const tenantMap = Object.fromEntries(tenants.map(t => [t.id, { name: profileMap[t.user_id || ""] || "Unknown", unit: t.unit_number }]));

      return (data || []).map(p => ({
        ...p,
        tenant_name: tenantMap[p.tenant_id]?.name || "Unknown",
        unit_number: tenantMap[p.tenant_id]?.unit || "",
      }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!payments?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No payments recorded for this property.</CardContent></Card>;
  }

  const totalCompleted = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalCompleted, "NGN")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">{p.tenant_name}</TableCell>
                  <TableCell>{p.unit_number}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(p.amount), "NGN")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[p.status] || ""}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.payment_method ? methodLabels[p.payment_method] || p.payment_method : "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
