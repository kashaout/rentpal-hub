import { useMemo } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFinancialTransactions } from "@/hooks/useFinancialData";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency } from "@/lib/formatCurrency";

export function StatementsTab() {
  const { data: transactions, isLoading: txLoading } = useFinancialTransactions();
  const { data: payments, isLoading: payLoading } = usePayments();

  const isLoading = txLoading || payLoading;

  const monthlyStatements = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; start: Date; end: Date }[] = [];

    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = i === 0 ? now : startOfMonth(subMonths(now, i - 1));
      months.push({
        key: format(start, "yyyy-MM"),
        label: format(start, "MMMM yyyy"),
        start,
        end,
      });
    }

    return months.map(m => {
      const monthTx = (transactions || []).filter(t => {
        const d = new Date(t.transaction_date);
        return d >= m.start && d < m.end;
      });
      const monthPay = (payments || []).filter(p => {
        const d = new Date(p.payment_date);
        return d >= m.start && d < m.end;
      });

      const rentIncome = monthPay
        .filter(p => p.status === "completed")
        .reduce((s, p) => s + Number(p.amount), 0);

      const otherIncome = monthTx
        .filter(t => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);

      const expenses = monthTx
        .filter(t => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);

      const totalIncome = rentIncome + otherIncome;
      const net = totalIncome - expenses;

      return {
        ...m,
        rentIncome,
        otherIncome,
        totalIncome,
        expenses,
        net,
        txCount: monthTx.length + monthPay.length,
      };
    });
  }, [transactions, payments]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Monthly Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Rent Income</TableHead>
                <TableHead className="text-right">Other Income</TableHead>
                <TableHead className="text-right">Total Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-center">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyStatements.map(m => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.rentIncome)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.otherIncome)}</TableCell>
                  <TableCell className="text-right text-success font-medium">{formatCurrency(m.totalIncome)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(m.expenses)}</TableCell>
                  <TableCell className={`text-right font-bold ${m.net >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(m.net)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{m.txCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
