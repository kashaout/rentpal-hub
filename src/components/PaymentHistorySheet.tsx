import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { usePaymentsByTenant, useDeletePayment, Payment } from "@/hooks/usePayments";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { TenantWithDetails } from "@/hooks/useTenants";
import { cn } from "@/lib/utils";

interface PaymentHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithDetails | null;
}

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-muted",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Check",
  card: "Card",
  other: "Other",
};

export function PaymentHistorySheet({
  open,
  onOpenChange,
  tenant,
}: PaymentHistorySheetProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const { data: payments, isLoading } = usePaymentsByTenant(tenant?.id || "");
  const deletePayment = useDeletePayment();

  const handleEdit = (payment: Payment) => {
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

  const totalPaid = payments
    ?.filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  if (!tenant) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Payment History</span>
              <Button
                size="sm"
                onClick={() => setPaymentDialogOpen(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Tenant Info */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="font-medium">{tenant.profile?.full_name || "Unknown Tenant"}</p>
              <p className="text-sm text-muted-foreground">
                {tenant.property_name} • Unit {tenant.unit_number}
              </p>
              <p className="mt-2 text-sm">
                Monthly Rent: <span className="font-medium">₦{Number(tenant.rent_amount).toLocaleString()}</span>
              </p>
              <p className="text-sm">
                Total Paid: <span className="font-medium text-success">${totalPaid.toLocaleString()}</span>
              </p>
            </div>

            {/* Payments Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${Number(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize", statusStyles[payment.status])}
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.payment_method
                            ? methodLabels[payment.payment_method]
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(payment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletePaymentId(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
                <p className="text-muted-foreground">No payments recorded yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Record First Payment
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={handlePaymentDialogClose}
        payment={editingPayment}
        defaultTenantId={tenant.id}
      />

      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
