import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePayment, useUpdatePayment, Payment } from "@/hooks/usePayments";
import { useTenants } from "@/hooks/useTenants";
import { format } from "date-fns";

const paymentSchema = z.object({
  tenant_id: z.string().min(1, "Please select a tenant"),
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Payment date is required"),
  due_date: z.string().optional(),
  status: z.enum(["completed", "pending", "failed", "refunded"]),
  payment_method: z.enum(["cash", "bank_transfer", "check", "card", "other"]).optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment;
  defaultTenantId?: string;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  defaultTenantId,
}: PaymentFormDialogProps) {
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const { data: tenants } = useTenants();

  const isEditing = !!payment;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      tenant_id: "",
      amount: 0,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      status: "completed",
      payment_method: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (payment) {
      form.reset({
        tenant_id: payment.tenant_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        due_date: payment.due_date || "",
        status: payment.status,
        payment_method: payment.payment_method || undefined,
        notes: payment.notes || "",
      });
    } else {
      form.reset({
        tenant_id: defaultTenantId || "",
        amount: 0,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        due_date: "",
        status: "completed",
        payment_method: undefined,
        notes: "",
      });
    }
  }, [payment, defaultTenantId, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      if (isEditing) {
        await updatePayment.mutateAsync({
          id: payment.id,
          amount: values.amount,
          payment_date: values.payment_date,
          status: values.status,
          due_date: values.due_date || null,
          payment_method: values.payment_method || null,
          notes: values.notes || null,
        });
      } else {
        await createPayment.mutateAsync({
          tenant_id: values.tenant_id,
          amount: values.amount,
          payment_date: values.payment_date,
          status: values.status,
          due_date: values.due_date || undefined,
          payment_method: values.payment_method || undefined,
          notes: values.notes || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = createPayment.isPending || updatePayment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Payment" : "Record Payment"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!defaultTenantId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.profile?.full_name || "Unknown"} - {tenant.property_name} Unit {tenant.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this payment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Updating..."
                    : "Recording..."
                  : isEditing
                  ? "Update Payment"
                  : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
