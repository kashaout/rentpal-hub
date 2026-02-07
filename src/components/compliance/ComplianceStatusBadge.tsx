import { cn } from "@/lib/utils";
import { ComplianceStatus, STATUS_LABELS } from "@/hooks/useCompliance";
import { CheckCircle, Clock, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  size?: "sm" | "md";
}

export function ComplianceStatusBadge({ status, size = "md" }: ComplianceStatusBadgeProps) {
  const config: Record<ComplianceStatus, { 
    Icon: typeof CheckCircle; 
    color: string; 
    bg: string;
    border: string;
  }> = {
    compliant: {
      Icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    pending: {
      Icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
    },
    expired: {
      Icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
    },
    non_compliant: {
      Icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
    },
    not_applicable: {
      Icon: MinusCircle,
      color: "text-muted-foreground",
      bg: "bg-muted",
      border: "border-border",
    },
  };

  const { Icon, color, bg, border } = config[status];

  const sizeClasses = size === "sm" 
    ? "text-xs px-2 py-0.5 gap-1" 
    : "text-sm px-2.5 py-1 gap-1.5";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        bg,
        border,
        color,
        sizeClasses
      )}
    >
      <Icon className={iconSize} />
      {STATUS_LABELS[status]}
    </span>
  );
}
