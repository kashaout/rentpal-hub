import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useCompleteCheckout } from "@/hooks/useCheckout";

interface CheckoutDialogProps {
  leaseId: string;
  /** Shown in the confirmation copy */
  propertyName?: string;
  tenantName?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "destructive" | "secondary";
  disabled?: boolean;
}

export function CheckoutDialog({
  leaseId,
  propertyName,
  tenantName,
  label = "Complete Checkout",
  size = "sm",
  variant = "outline",
  disabled,
}: CheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const checkout = useCompleteCheckout();

  return (
    <>
      <Button
        size={size}
        variant={variant}
        disabled={disabled || !leaseId}
        onClick={() => setOpen(true)}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete checkout?</AlertDialogTitle>
            <AlertDialogDescription>
              This ends {tenantName ? `${tenantName}'s` : "this"} tenancy
              {propertyName ? ` at ${propertyName}` : ""}, records the move-out
              date and releases the unit so it can be listed again. The lease,
              payments, documents and maintenance history are all kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkout.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={checkout.isPending}
              onClick={async (e) => {
                e.preventDefault();
                await checkout.mutateAsync({ leaseId }).catch(() => null);
                setOpen(false);
              }}
            >
              {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm checkout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
