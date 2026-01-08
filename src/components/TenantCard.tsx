import { Mail, Phone, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type PaymentStatus = "paid" | "pending" | "overdue";

interface TenantCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  unit: string;
  leaseEnd: string;
  paymentStatus: PaymentStatus;
  className?: string;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function TenantCard({
  name,
  email,
  phone,
  property,
  unit,
  leaseEnd,
  paymentStatus,
  className,
}: TenantCardProps) {
  const status = statusConfig[paymentStatus];
  const StatusIcon = status.icon;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-12 w-12 border-2 border-accent/20">
          <AvatarFallback className="bg-gradient-slate text-primary-foreground font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-card-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {property} • Unit {unit}
              </p>
            </div>
            <Badge variant="outline" className={cn("shrink-0", status.className)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          </div>

          {/* Lease Info */}
          <div className="mt-3 flex items-center gap-1 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Lease ends:</span>
            <span className="font-medium text-card-foreground">{leaseEnd}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
