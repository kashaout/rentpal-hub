import { ReactNode } from "react";
import { LucideIcon, Inbox, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
  /** Show an upgrade prompt for plan-gated features */
  upgradePlan?: string;
  onUpgrade?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
  upgradePlan,
  onUpgrade,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
      {upgradePlan && onUpgrade && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Upgrade to {upgradePlan}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Unlock this feature and more by upgrading your subscription plan.
          </p>
          <Button size="sm" onClick={onUpgrade} className="gap-1.5">
            <Crown className="h-3.5 w-3.5" /> View Plans
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
