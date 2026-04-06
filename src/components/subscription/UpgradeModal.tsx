import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Building2, ArrowRight } from "lucide-react";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";
import { PLAN_CONFIGS } from "@/hooks/useSubscription";
import { formatCurrency } from "@/lib/formatCurrency";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "property_limit" | "feature" | "expired";
  featureName?: string;
  onNavigateToPlans?: () => void;
}

export function UpgradeModal({ open, onOpenChange, reason = "property_limit", featureName, onNavigateToPlans }: UpgradeModalProps) {
  const { plan, planName, propertyCount, propertyLimit } = useSubscriptionContext();

  const getTitle = () => {
    switch (reason) {
      case "property_limit":
        return "Property Limit Reached";
      case "feature":
        return "Feature Not Available";
      case "expired":
        return "Subscription Expired";
      default:
        return "Upgrade Required";
    }
  };

  const getDescription = () => {
    switch (reason) {
      case "property_limit":
        return `You've used ${propertyCount} of ${propertyLimit} properties on the ${planName} plan. Upgrade to add more properties.`;
      case "feature":
        return `${featureName || "This feature"} is not available on the ${planName} plan. Upgrade to unlock it.`;
      case "expired":
        return "Your subscription has expired. Renew or upgrade to continue managing your properties.";
      default:
        return "Upgrade your plan to access this feature.";
    }
  };

  // Suggest next plan
  const planOrder = ["free", "basic", "pro", "business"] as const;
  const currentIdx = planOrder.indexOf(plan);
  const nextPlan = currentIdx < planOrder.length - 1 ? planOrder[currentIdx + 1] : "business";
  const nextConfig = PLAN_CONFIGS[nextPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription className="mt-1">{getDescription()}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{nextConfig.name} Plan</p>
              <p className="text-sm text-muted-foreground">{nextConfig.description}</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(nextConfig.price)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Up to {nextConfig.property_limit === 999 ? "unlimited" : nextConfig.property_limit} properties</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              onOpenChange(false);
              onNavigateToPlans?.();
            }}
          >
            View Plans <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
