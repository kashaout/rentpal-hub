import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon, Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  useIncomeStatement,
  useRentRoll,
  useExpenseLedger,
  useEscrowReconciliation,
  type ReportDateRange,
} from "@/hooks/useAccountantReports";
import {
  exportAccountantPDF,
  exportAccountantCSV,
  fmtMoney,
  fmtMoneyRaw,
} from "@/lib/accountantExport";
import { formatCurrency } from "@/lib/formatCurrency";

function DateRangePicker({
  range,
  onChange,
}: {
  range: ReportDateRange;
  onChange: (r: ReportDateRange) => void;
}) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !range.from && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(range.from, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={range.from} onSelect={(d) => { if (d) { onChange({ ...range, from: d }); setFromOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-sm">to</span>
      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !range.to && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(range.to, "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={range.to} onSelect={(d) => { if (d) { onChange({ ...range, to: d }); setToOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ExportButtons({ onPDF, onCSV, disabled }: { onPDF: () => void; onCSV: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={onCSV} disabled={disabled}>
        <Download className="h-3.5 w-3.5" /> Export Accountant CSV
      </Button>
      <Button size="sm" className="gap-2" onClick={onPDF} disabled={disabled}>
        <FileText className="h-3.5 w-3.5" /> Export Accountant PDF
      </Button>
    </div>
  );
}

function SummaryCard({ label, value, variant }: { label: string; value: string; variant?: "default" | "success" | "destructive" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-xl font-bold", variant === "success" && "text-success", variant === "destructive" && "text-destructive")}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Income Statement Tab ────────────────────────────────────────────────────

function IncomeStatementTab({ range }: { range: ReportDateRange }) {
  const { data, isLoading } = useIncomeStatement(range);

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const headers = ["Date", "Property", "Category", "Description", "Income (₦)", "Expense (₦)", "Running Balance (₦)"];
  const rows = data.rows.map((r) => [
    format(new Date(r.date), "yyyy-MM-dd"),
    r.property, r.category, r.description,
    r.income > 0 ? fmtMoney(r.income) : "",
    r.expense > 0 ? fmtMoney(r.expense) : "",
    fmtMoney(r.balance),
  ]);
  const csvRows = data.rows.map((r) => [
    format(new Date(r.date), "yyyy-MM-dd"),
    r.property, r.category, r.description,
    r.income > 0 ? fmtMoneyRaw(r.income) : "0.00",
    r.expense > 0 ? fmtMoneyRaw(r.expense) : "0.00",
    fmtMoneyRaw(r.balance),
  ]);
  const totals = [
    { label: "Total Income", value: fmtMoney(data.totalIncome) },
    { label: "Total Expenses", value: fmtMoney(data.totalExpense) },
    { label: "Net Profit / (Loss)", value: fmtMoney(data.netProfit) },
  ];
  const csvTotals = [
    { label: "Total Income", value: fmtMoneyRaw(data.totalIncome) },
    { label: "Total Expenses", value: fmtMoneyRaw(data.totalExpense) },
    { label: "Net Profit / (Loss)", value: fmtMoneyRaw(data.netProfit) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Income Statement (Profit & Loss)</h3>
          <p className="text-sm text-muted-foreground">{format(range.from, "MMM d, yyyy")} – {format(range.to, "MMM d, yyyy")}</p>
        </div>
        <ExportButtons
          disabled={data.rows.length === 0}
          onPDF={() => exportAccountantPDF({ title: "Income Statement (Profit & Loss)", dateFrom: range.from, dateTo: range.to }, headers, rows, totals)}
          onCSV={() => exportAccountantCSV({ title: "Income_Statement_PnL", dateFrom: range.from, dateTo: range.to }, headers, csvRows, csvTotals)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Income" value={formatCurrency(data.totalIncome)} variant="success" />
        <SummaryCard label="Total Expenses" value={formatCurrency(data.totalExpense)} variant="destructive" />
        <SummaryCard label="Net Profit" value={formatCurrency(data.netProfit)} variant={data.netProfit >= 0 ? "success" : "destructive"} />
      </div>

      {/* Category breakdown */}
      {Object.keys(data.incomeByCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Income by Category</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(data.incomeByCategory).map(([cat, amt]) => (
              <Badge key={cat} variant="outline" className="text-xs">{cat}: {formatCurrency(amt as number)}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
      {Object.keys(data.expenseByCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(data.expenseByCategory).map(([cat, amt]) => (
              <Badge key={cat} variant="outline" className="text-xs">{cat}: {formatCurrency(amt as number)}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions in this period</TableCell></TableRow>
              ) : data.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{format(new Date(r.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="text-xs">{r.property}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.description}</TableCell>
                  <TableCell className="text-xs text-success font-medium">{r.income > 0 ? formatCurrency(r.income) : ""}</TableCell>
                  <TableCell className="text-xs text-destructive font-medium">{r.expense > 0 ? formatCurrency(r.expense) : ""}</TableCell>
                  <TableCell className="text-xs font-semibold">{formatCurrency(r.balance)}</TableCell>
                </TableRow>
              ))}
              {data.rows.length > 0 && (
                <>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4} className="text-xs text-right">Totals</TableCell>
                    <TableCell className="text-xs text-success">{formatCurrency(data.totalIncome)}</TableCell>
                    <TableCell className="text-xs text-destructive">{formatCurrency(data.totalExpense)}</TableCell>
                    <TableCell className="text-xs font-bold">{formatCurrency(data.netProfit)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rent Roll Tab ───────────────────────────────────────────────────────────

function RentRollTab({ range }: { range: ReportDateRange }) {
  const { data, isLoading } = useRentRoll(range);

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const headers = ["Property", "Unit", "Tenant", "Lease Start", "Lease End", "Monthly Rent (₦)", "Paid This Period (₦)", "Outstanding (₦)"];
  const rows = data.rows.map((r) => [r.property, r.unit, r.tenant, r.leaseStart, r.leaseEnd, fmtMoney(r.monthlyRent), fmtMoney(r.paidThisPeriod), fmtMoney(r.outstanding)]);
  const csvRows = data.rows.map((r) => [r.property, r.unit, r.tenant, r.leaseStart, r.leaseEnd, fmtMoneyRaw(r.monthlyRent), fmtMoneyRaw(r.paidThisPeriod), fmtMoneyRaw(r.outstanding)]);
  const totals = [
    { label: "Total Monthly Rent", value: fmtMoney(data.totalMonthlyRent) },
    { label: "Total Paid", value: fmtMoney(data.totalPaid) },
    { label: "Total Outstanding", value: fmtMoney(data.totalOutstanding) },
  ];
  const csvTotals = [
    { label: "Total Monthly Rent", value: fmtMoneyRaw(data.totalMonthlyRent) },
    { label: "Total Paid", value: fmtMoneyRaw(data.totalPaid) },
    { label: "Total Outstanding", value: fmtMoneyRaw(data.totalOutstanding) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Rent Roll Report</h3>
          <p className="text-sm text-muted-foreground">{format(range.from, "MMM d, yyyy")} – {format(range.to, "MMM d, yyyy")}</p>
        </div>
        <ExportButtons
          disabled={data.rows.length === 0}
          onPDF={() => exportAccountantPDF({ title: "Rent Roll Report", dateFrom: range.from, dateTo: range.to }, headers, rows, totals)}
          onCSV={() => exportAccountantCSV({ title: "Rent_Roll_Report", dateFrom: range.from, dateTo: range.to }, headers, csvRows, csvTotals)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Monthly Rent" value={formatCurrency(data.totalMonthlyRent)} />
        <SummaryCard label="Collected This Period" value={formatCurrency(data.totalPaid)} variant="success" />
        <SummaryCard label="Outstanding" value={formatCurrency(data.totalOutstanding)} variant={data.totalOutstanding > 0 ? "destructive" : "default"} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>{headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No active leases or tenants</TableCell></TableRow>
              ) : data.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{r.property}</TableCell>
                  <TableCell className="text-xs">{r.unit}</TableCell>
                  <TableCell className="text-xs">{r.tenant}</TableCell>
                  <TableCell className="text-xs">{r.leaseStart}</TableCell>
                  <TableCell className="text-xs">{r.leaseEnd}</TableCell>
                  <TableCell className="text-xs">{formatCurrency(r.monthlyRent)}</TableCell>
                  <TableCell className="text-xs text-success">{formatCurrency(r.paidThisPeriod)}</TableCell>
                  <TableCell className={cn("text-xs font-medium", r.outstanding > 0 && "text-destructive")}>{formatCurrency(r.outstanding)}</TableCell>
                </TableRow>
              ))}
              {data.rows.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-xs text-right">Totals</TableCell>
                  <TableCell className="text-xs">{formatCurrency(data.totalMonthlyRent)}</TableCell>
                  <TableCell className="text-xs text-success">{formatCurrency(data.totalPaid)}</TableCell>
                  <TableCell className="text-xs text-destructive">{formatCurrency(data.totalOutstanding)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Expense Ledger Tab ──────────────────────────────────────────────────────

function ExpenseLedgerTab({ range }: { range: ReportDateRange }) {
  const { data, isLoading } = useExpenseLedger(range);

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const headers = ["Date", "Property", "Category", "Vendor/Method", "Description", "Amount (₦)"];
  const rows = data.rows.map((r) => [format(new Date(r.date), "yyyy-MM-dd"), r.property, r.category, r.vendor, r.description, fmtMoney(r.amount)]);
  const csvRows = data.rows.map((r) => [format(new Date(r.date), "yyyy-MM-dd"), r.property, r.category, r.vendor, r.description, fmtMoneyRaw(r.amount)]);
  const totals = [{ label: "Total Expenses", value: fmtMoney(data.totalExpenses) }];
  const csvTotals = [{ label: "Total Expenses", value: fmtMoneyRaw(data.totalExpenses) }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Expense Ledger</h3>
          <p className="text-sm text-muted-foreground">{format(range.from, "MMM d, yyyy")} – {format(range.to, "MMM d, yyyy")}</p>
        </div>
        <ExportButtons
          disabled={data.rows.length === 0}
          onPDF={() => exportAccountantPDF({ title: "Expense Ledger", dateFrom: range.from, dateTo: range.to }, headers, rows, totals)}
          onCSV={() => exportAccountantCSV({ title: "Expense_Ledger", dateFrom: range.from, dateTo: range.to }, headers, csvRows, csvTotals)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Total Expenses" value={formatCurrency(data.totalExpenses)} variant="destructive" />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">By Category</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(data.byCategory).map(([cat, amt]) => (
              <Badge key={cat} variant="outline" className="text-xs">{cat}: {formatCurrency(amt as number)}</Badge>
            ))}
            {Object.keys(data.byCategory).length === 0 && <span className="text-xs text-muted-foreground">No expenses</span>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>{headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses in this period</TableCell></TableRow>
              ) : data.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{format(new Date(r.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="text-xs">{r.property}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.vendor}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.description}</TableCell>
                  <TableCell className="text-xs font-medium">{formatCurrency(r.amount)}</TableCell>
                </TableRow>
              ))}
              {data.rows.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-xs text-right">Total Expenses</TableCell>
                  <TableCell className="text-xs font-bold">{formatCurrency(data.totalExpenses)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Escrow Reconciliation Tab ───────────────────────────────────────────────

function EscrowReconciliationTab({ range }: { range: ReportDateRange }) {
  const { data, isLoading } = useEscrowReconciliation(range);

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const headers = ["Date", "Booking", "Tenant", "Amount Held (₦)", "Amount Released (₦)", "Status", "Stripe Reference"];
  const rows = data.rows.map((r) => [r.date, r.booking, r.tenant, r.amountHeld > 0 ? fmtMoney(r.amountHeld) : "", r.amountReleased > 0 ? fmtMoney(r.amountReleased) : "", r.status, r.stripeRef]);
  const csvRows = data.rows.map((r) => [r.date, r.booking, r.tenant, fmtMoneyRaw(r.amountHeld), fmtMoneyRaw(r.amountReleased), r.status, r.stripeRef]);
  const totals = [
    { label: "Total Held", value: fmtMoney(data.totalHeld) },
    { label: "Total Released", value: fmtMoney(data.totalReleased) },
    { label: "Net in Escrow", value: fmtMoney(data.netHeld) },
  ];
  const csvTotals = [
    { label: "Total Held", value: fmtMoneyRaw(data.totalHeld) },
    { label: "Total Released", value: fmtMoneyRaw(data.totalReleased) },
    { label: "Net in Escrow", value: fmtMoneyRaw(data.netHeld) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Escrow & Payout Reconciliation</h3>
          <p className="text-sm text-muted-foreground">{format(range.from, "MMM d, yyyy")} – {format(range.to, "MMM d, yyyy")}</p>
        </div>
        <ExportButtons
          disabled={data.rows.length === 0}
          onPDF={() => exportAccountantPDF({ title: "Escrow & Payout Reconciliation", dateFrom: range.from, dateTo: range.to }, headers, rows, totals)}
          onCSV={() => exportAccountantCSV({ title: "Escrow_Payout_Reconciliation", dateFrom: range.from, dateTo: range.to }, headers, csvRows, csvTotals)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Held" value={formatCurrency(data.totalHeld)} />
        <SummaryCard label="Total Released" value={formatCurrency(data.totalReleased)} variant="success" />
        <SummaryCard label="Net in Escrow" value={formatCurrency(data.netHeld)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>{headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No escrow transactions in this period</TableCell></TableRow>
              ) : data.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.booking !== "N/A" ? r.booking.substring(0, 8) + "…" : "—"}</TableCell>
                  <TableCell className="text-xs">{r.tenant}</TableCell>
                  <TableCell className="text-xs">{r.amountHeld > 0 ? formatCurrency(r.amountHeld) : ""}</TableCell>
                  <TableCell className="text-xs text-success">{r.amountReleased > 0 ? formatCurrency(r.amountReleased) : ""}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.stripeRef !== "N/A" ? r.stripeRef.substring(0, 12) + "…" : "—"}</TableCell>
                </TableRow>
              ))}
              {data.rows.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="text-xs text-right">Totals</TableCell>
                  <TableCell className="text-xs">{formatCurrency(data.totalHeld)}</TableCell>
                  <TableCell className="text-xs text-success">{formatCurrency(data.totalReleased)}</TableCell>
                  <TableCell colSpan={2} className="text-xs">Net: {formatCurrency(data.netHeld)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Accountant Reports Component ───────────────────────────────────────

export function AccountantReports() {
  const [range, setRange] = useState<ReportDateRange>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Accountant Reports</h3>
          <p className="text-sm text-muted-foreground">Professional financial statements for tax filing & reconciliation</p>
        </div>
        <DateRangePicker range={range} onChange={setRange} />
      </div>

      <Tabs defaultValue="income-statement">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="income-statement" className="text-xs">Income Statement (P&L)</TabsTrigger>
          <TabsTrigger value="rent-roll" className="text-xs">Rent Roll</TabsTrigger>
          <TabsTrigger value="expense-ledger" className="text-xs">Expense Ledger</TabsTrigger>
          <TabsTrigger value="escrow" className="text-xs">Escrow Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement"><IncomeStatementTab range={range} /></TabsContent>
        <TabsContent value="rent-roll"><RentRollTab range={range} /></TabsContent>
        <TabsContent value="expense-ledger"><ExpenseLedgerTab range={range} /></TabsContent>
        <TabsContent value="escrow"><EscrowReconciliationTab range={range} /></TabsContent>
      </Tabs>
    </div>
  );
}
