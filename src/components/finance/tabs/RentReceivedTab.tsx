import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency } from "@/lib/formatCurrency";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground",
};

export function RentReceivedTab() {
  const { data: payments, isLoading } = usePayments();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalReceived = (payments || [])
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = (payments || [])
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Rent payments recorded against tenants. These are direct tenant-to-landlord payments tracked in the Payments module.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold">{payments?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rent Payments</CardTitle></CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-muted-foreground text-center py-8">No rent payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{p.tenant_name}</TableCell>
                    <TableCell>{p.property_name}</TableCell>
                    <TableCell>{p.unit_number}</TableCell>
                    <TableCell className="capitalize">{p.payment_method?.replace("_", " ") || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[p.status] || ""}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
