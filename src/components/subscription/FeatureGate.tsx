import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown } from "lucide-react";
import { useHasFeature, SubscriptionFeatures, PLAN_CONFIGS, SubscriptionPlan } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  showUpgradePrompt?: boolean;
  minPlan?: SubscriptionPlan;
}

const FEATURE_NAMES: Record<keyof SubscriptionFeatures, string> = {
  compliance_tracker: "Compliance Tracker",
  automation_workflows: "Automation Workflows",
  advanced_reports: "Advanced Reports",
  ai_insights: "AI Insights",
  multi_user: "Multi-User Access",
  maintenance: "Maintenance",
  financials: "Financials",
  reports: "Reports",
  consultants: "Consultants",
};

const FEATURE_MIN_PLANS: Record<keyof SubscriptionFeatures, SubscriptionPlan> = {
  compliance_tracker: "basic",
  automation_workflows: "business",
  advanced_reports: "pro",
  ai_insights: "business",
  multi_user: "pro",
  maintenance: "basic",
  financials: "pro",
  reports: "pro",
  consultants: "business",
};

export function FeatureGate({
  feature,
  children,
  fallback,
  className,
  showUpgradePrompt = true,
  minPlan,
}: FeatureGateProps) {
  const { hasFeature, isLoading, plan } = useHasFeature(feature);

  if (isLoading) {
    return null;
  }

  if (hasFeature) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const requiredPlan = minPlan || FEATURE_MIN_PLANS[feature];
  const planConfig = PLAN_CONFIGS[requiredPlan];

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="p-3 rounded-full bg-muted mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">{FEATURE_NAMES[feature]}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          Upgrade to the {planConfig.name} plan or higher to unlock this feature.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Current: {PLAN_CONFIGS[plan || "free"].name}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Crown className="h-3 w-3" />
            Requires: {planConfig.name}+
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface PropertyLimitGateProps {
  currentCount: number;
  limit: number;
  children: ReactNode;
  onLimitReached?: () => void;
}

export function PropertyLimitGate({ 
  currentCount, 
  limit, 
  children, 
  onLimitReached 
}: PropertyLimitGateProps) {
  if (currentCount < limit) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed border-warning">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="p-3 rounded-full bg-warning/10 mb-4">
          <Lock className="h-6 w-6 text-warning" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Property Limit Reached</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          You've reached your limit of {limit} properties. Upgrade your plan to add more.
        </p>
        <Button onClick={onLimitReached}>
          <Crown className="h-4 w-4 mr-2" />
          View Plans
        </Button>
      </CardContent>
    </Card>
  );
}
