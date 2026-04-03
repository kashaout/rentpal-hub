import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Loader2,
  Search,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePayments, useDeletePayment, Payment, PaymentWithTenant } from "@/hooks/usePayments";
import { usePaymentsByTenant } from "@/hooks/usePayments";
import { useProperties } from "@/hooks/useProperties";
import { PaymentFormDialog } from "@/components/PaymentFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-muted",
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  pending: Clock,
  failed: AlertCircle,
  refunded: AlertCircle,
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Check",
  card: "Card",
  stripe: "Online (Stripe)",
  other: "Other",
};

type DateRange = "all" | "this-month" | "last-month" | "last-3-months" | "custom";

// ─── Tenant View ────────────────────────────────────────────────────────
function TenantPaymentsView() {
  const { data: lease } = useTenantLease();
  const { data: payments, isLoading } = usePaymentsByTenant(lease?.id || "");

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPaid = payments?.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">₦{totalPaid.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{payments?.filter(p => p.status === "completed").length || 0} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              ₦{(payments?.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0) || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{payments?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {payments && payments.length > 0 ? (
        <div className="rounded-lg border">
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
              {payments.map((payment) => {
                const StatusIcon = statusIcons[payment.status] || Clock;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">₦{Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize gap-1", statusStyles[payment.status])}>
                        <StatusIcon className="h-3 w-3" />
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {payment.payment_method ? methodLabels[payment.payment_method] || payment.payment_method.replace("_", " ") : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {payment.notes || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <Banknote className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-foreground">No payment history</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your payments will appear here once you make a rent payment.</p>
        </div>
      )}
    </div>
  );
}

// ─── Landlord / Admin View ──────────────────────────────────────────────
function LandlordPaymentsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const { data: payments, isLoading } = usePayments();
  const { data: properties } = useProperties();
  const deletePayment = useDeletePayment();

  const paymentProperties = useMemo(() => {
    if (!payments) return [];
    const uniqueProps = [...new Set(payments.map((p) => p.property_name))];
    return uniqueProps.sort();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    let filtered = [...payments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.tenant_name.toLowerCase().includes(query) ||
          p.property_name.toLowerCase().includes(query) ||
          p.unit_number.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (propertyFilter !== "all") {
      filtered = filtered.filter((p) => p.property_name === propertyFilter);
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateRange) {
      case "this-month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last-month":
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case "last-3-months":
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case "custom":
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) endDate = new Date(customEndDate);
        break;
    }

    if (startDate) filtered = filtered.filter((p) => new Date(p.payment_date) >= startDate!);
    if (endDate) filtered = filtered.filter((p) => new Date(p.payment_date) <= endDate!);

    return filtered;
  }, [payments, searchQuery, statusFilter, propertyFilter, dateRange, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    const total = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const completed = filteredPayments.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = filteredPayments.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
    const count = filteredPayments.length;
    return { total, completed, pending, count };
  }, [filteredPayments]);

  const handleEdit = (payment: PaymentWithTenant) => {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentDialogClose = (open: boolean) => {
    setPaymentDialogOpen(open);
    if (!open) setEditingPayment(undefined);
  };

  const handleDelete = async () => {
    if (deletePaymentId) {
      await deletePayment.mutateAsync(deletePaymentId);
      setDeletePaymentId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPropertyFilter("all");
    setDateRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || propertyFilter !== "all" || dateRange !== "all";

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{stats.total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{stats.count} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">₦{stats.completed.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">₦{stats.pending.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Awaiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Of total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tenant, property..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="last-3-months">Last 3 months</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <>
            <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-[140px]" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-[140px]" />
          </>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Property" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {paymentProperties.map((prop) => (
              <SelectItem key={prop} value={prop}>{prop}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={() => setPaymentDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const StatusIcon = statusIcons[payment.status] || Clock;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.tenant_name}</p>
                        <p className="text-sm text-muted-foreground">Unit {payment.unit_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.property_name}</TableCell>
                    <TableCell className="font-medium">₦{Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize gap-1", statusStyles[payment.status])}>
                        <StatusIcon className="h-3 w-3" />
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.payment_method ? methodLabels[payment.payment_method] || payment.payment_method.replace("_", " ") : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.due_date ? format(new Date(payment.due_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(payment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(payment.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <Banknote className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-foreground">No payments found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters ? "Try adjusting your filters." : "Record your first payment to get started."}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setPaymentDialogOpen(true)} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      )}

      <PaymentFormDialog open={paymentDialogOpen} onOpenChange={handlePaymentDialogClose} payment={editingPayment} />

      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this payment record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePayment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────
export function PaymentsPage() {
  const { isTenant, isAdmin, isConsultant, isLandlord } = useAuth();
  const isTenantOnly = isTenant && !isAdmin && !isConsultant && !isLandlord;

  if (isTenantOnly) {
    return <TenantPaymentsView />;
  }

  return <LandlordPaymentsView />;
}
