import { Mail, Phone, Calendar, MoreHorizontal, Pencil, Trash2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";
import { TenantWithDetails, useDeleteTenant, useUpdatePaymentStatus } from "@/hooks/useTenants";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

type PaymentStatus = "paid" | "pending" | "overdue";

interface TenantCardProps {
  tenant: TenantWithDetails;
  onEdit: (tenant: TenantWithDetails) => void;
  onViewPayments?: (tenant: TenantWithDetails) => void;
  className?: string;
}

export function TenantCard({ tenant, onEdit, onViewPayments, className }: TenantCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteTenant = useDeleteTenant();
  const updatePaymentStatus = useUpdatePaymentStatus();

  const { property_name, unit_number, lease_end, payment_status, profile, user_id } = tenant;
  const hasLinkedUser = !!user_id && !!profile;
  const name = hasLinkedUser ? (profile?.full_name || profile?.email) : "Unlinked Unit";
  const email = profile?.email || "";
  const phone = profile?.phone || "";

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const formattedLeaseEnd = format(new Date(lease_end), "MMM d, yyyy");

  const handleDelete = async () => {
    await deleteTenant.mutateAsync(tenant.id);
    setShowDeleteDialog(false);
  };

  const handleStatusChange = async (newStatus: PaymentStatus) => {
    await updatePaymentStatus.mutateAsync({ id: tenant.id, status: newStatus });
  };

  return (
    <>
      <div className={cn("group rounded-lg border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in", className)}>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-accent/20">
            <AvatarFallback className="bg-gradient-slate text-primary-foreground font-medium">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-card-foreground">{name}</h3>
                <p className="text-sm text-muted-foreground">{property_name} • Unit {unit_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <StatusBadge status={payment_status} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange("paid")}>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Mark as Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                      <Clock className="mr-2 h-4 w-4 text-warning" /> Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("overdue")}>
                      <AlertCircle className="mr-2 h-4 w-4 text-destructive" /> Mark as Overdue
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(tenant)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit Tenant
                    </DropdownMenuItem>
                    {onViewPayments && (
                      <DropdownMenuItem onClick={() => onViewPayments(tenant)}>
                        <Receipt className="mr-2 h-4 w-4" /> Payment History
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Tenant
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {hasLinkedUser && email ? (
                <a href={`mailto:${email}`} className="flex items-center gap-1 transition-colors hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" />{email}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="h-3.5 w-3.5" />No user linked - tenant cannot access portal
                </span>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1 transition-colors hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" />{phone}
                </a>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Lease ends:</span>
              <span className="font-medium text-card-foreground">{formattedLeaseEnd}</span>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove {name} from {property_name}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTenant.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
