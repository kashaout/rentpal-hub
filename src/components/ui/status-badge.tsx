import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "destructive" | "info" | "muted" | "primary";

const STATUS_MAP: Record<string, StatusVariant> = {
  // Tenant/Payment statuses
  paid: "success",
  completed: "success",
  current: "success",
  active: "success",
  confirmed: "success",
  compliant: "success",
  verified: "success",
  closed: "muted",
  resolved: "success",

  pending: "warning",
  pending_signature: "warning",
  in_progress: "info",
  assigned: "info",
  awaiting_review: "info",
  processing: "info",

  overdue: "destructive",
  expired: "destructive",
  cancelled: "destructive",
  rejected: "destructive",
  non_compliant: "destructive",
  urgent: "destructive",
  failed: "destructive",
  blocked: "destructive",

  draft: "muted",
  new: "primary",
  open: "primary",
  created: "primary",
  not_applicable: "muted",
  medium: "warning",
  low: "muted",
  high: "destructive",
  critical: "destructive",
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  destructive: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  variant?: StatusVariant;
}

export function StatusBadge({ status, className, variant }: StatusBadgeProps) {
  const normalised = status.toLowerCase().replace(/[\s-]+/g, "_");
  const resolved = variant || STATUS_MAP[normalised] || "muted";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", VARIANT_STYLES[resolved], className)}>
      {label}
    </Badge>
  );
}
