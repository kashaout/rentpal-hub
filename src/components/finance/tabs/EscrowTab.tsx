import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEscrowTransactions, useEscrowBalance } from "@/hooks/useEscrow";
import { formatCurrency } from "@/lib/formatCurrency";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  capture: "Captured",
  release: "Released",
  refund: "Refunded",
};

export function EscrowTab() {
  const { data: transactions, isLoading } = useEscrowTransactions();
  const { data: balance } = useEscrowBalance();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Escrow holds money securely between tenant payment and landlord payout — used for bookings, deposits, and dispute resolution.</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Held in Escrow</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(balance?.held || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Released</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(balance?.released || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Refunded</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(balance?.refunded || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(balance?.balance || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Escrow Transactions</CardTitle></CardHeader>
        <CardContent>
          {!transactions?.length ? (
            <p className="text-muted-foreground text-center py-8">No escrow transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {typeLabels[t.transaction_type] || t.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.description || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{t.reference_id || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[t.status] || ""}>{t.status}</Badge>
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
