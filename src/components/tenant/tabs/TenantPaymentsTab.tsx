import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaymentsByTenant } from "@/hooks/usePayments";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
  tenantId: string;
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

export function TenantPaymentsTab({ tenantId }: Props) {
  const { data: payments, isLoading } = usePaymentsByTenant(tenantId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!payments?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No payments recorded yet.</CardContent></Card>;
  }

  const totalPaid = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid, "NGN")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(p.amount), "NGN")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[p.status] || ""}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.payment_method ? methodLabels[p.payment_method] || p.payment_method : "–"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.notes || "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
