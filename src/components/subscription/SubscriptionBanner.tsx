import { Crown, Building2, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";
import { PLAN_CONFIGS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface SubscriptionBannerProps {
  onNavigateToPlans?: () => void;
}

export function SubscriptionBanner({ onNavigateToPlans }: SubscriptionBannerProps) {
  const { plan, planName, propertyCount, propertyLimit, isExpired, isReadOnly } = useSubscriptionContext();

  const usage = propertyLimit > 0 ? Math.min((propertyCount / propertyLimit) * 100, 100) : 0;
  const isNearLimit = usage >= 80;

  if (isExpired || isReadOnly) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-destructive">Subscription {isExpired ? "Expired" : "Inactive"}</p>
          <p className="text-sm text-muted-foreground">Your account is in read-only mode. Upgrade to continue managing properties.</p>
        </div>
        <Button size="sm" variant="destructive" onClick={onNavigateToPlans} className="gap-2">
          <Crown className="h-4 w-4" /> Reactivate
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 flex items-center gap-4 flex-wrap",
      isNearLimit ? "border-warning/30 bg-warning/5" : "border-border bg-card"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        plan === "business" ? "bg-primary/10" : "bg-secondary"
      )}>
        <Crown className={cn("h-5 w-5", plan === "business" ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{planName} Plan</p>
          <Badge variant="outline" className="text-xs">{propertyCount} / {propertyLimit === 999 ? "∞" : propertyLimit} properties</Badge>
        </div>
        <div className="mt-1.5 max-w-[200px]">
          <Progress value={usage} className={cn("h-1.5", isNearLimit && "[&>div]:bg-warning")} />
        </div>
      </div>
      {plan !== "business" && (
        <Button size="sm" variant="outline" onClick={onNavigateToPlans} className="gap-2">
          Upgrade <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
