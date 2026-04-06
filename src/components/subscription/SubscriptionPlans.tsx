import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Loader2, CreditCard, ExternalLink } from "lucide-react";
import { useStripeSubscription, useStripeCheckout, useCustomerPortal, STRIPE_PLAN_MAP } from "@/hooks/useStripeSubscription";
import { PLAN_CONFIGS, SubscriptionPlan } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const PLAN_ORDER: SubscriptionPlan[] = ["free", "basic", "pro", "business"];

const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  free: <Building2 className="h-6 w-6" />,
  basic: <Building2 className="h-6 w-6" />,
  pro: <Zap className="h-6 w-6" />,
  business: <Crown className="h-6 w-6" />,
};

const FEATURE_LABELS: Record<string, string> = {
  compliance_tracker: "Compliance Tracker",
  automation_workflows: "Automation Workflows",
  advanced_reports: "Advanced Reports",
  ai_insights: "AI Insights",
  multi_user: "Multi-User Access",
  maintenance: "Maintenance Board",
  financials: "Financial Intelligence",
  reports: "Reports & Analytics",
  consultants: "Consultants & Automation",
};

export function SubscriptionPlans() {
  const { currentPlan, isLoading, subscribed, subscription_end, refresh } = useStripeSubscription();
  const { checkout, isLoading: checkoutLoading } = useStripeCheckout();
  const { openPortal, isLoading: portalLoading } = useCustomerPortal();

  const handleSelectPlan = (planKey: SubscriptionPlan) => {
    if (planKey === currentPlan || planKey === "free") return;
    const stripeConfig = STRIPE_PLAN_MAP[planKey];
    if (stripeConfig) {
      checkout(stripeConfig.price_id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Scale your property management with the right features for your portfolio
        </p>
        {subscribed && subscription_end && (
          <p className="text-sm text-muted-foreground mt-1">
            Current billing period ends: {new Date(subscription_end).toLocaleDateString()}
          </p>
        )}
      </div>

      {subscribed && (
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={openPortal}
            disabled={portalLoading}
            className="gap-2"
          >
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Manage Billing
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button variant="ghost" onClick={refresh} size="sm">
            Refresh Status
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((planKey) => {
          const plan = PLAN_CONFIGS[planKey];
          const isCurrentPlan = currentPlan === planKey;
          const isPro = planKey === "pro";

          return (
            <Card 
              key={planKey} 
              className={cn(
                "relative",
                isPro && "border-accent shadow-lg scale-105",
                isCurrentPlan && "ring-2 ring-primary"
              )}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground">Most Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className={cn(
                  "mx-auto mb-2 p-2 rounded-full w-fit",
                  planKey === "business" && "bg-warning/10 text-warning",
                  planKey === "pro" && "bg-accent/10 text-accent",
                  planKey === "basic" && "bg-primary/10 text-primary",
                  planKey === "free" && "bg-muted text-muted-foreground"
                )}>
                  {PLAN_ICONS[planKey]}
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? "Free" : `₦${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/mo</span>}
                </div>

                <div className="text-sm text-muted-foreground mb-4">
                  Up to <strong>{plan.property_limit === 999 ? "Unlimited" : plan.property_limit}</strong> properties
                </div>

                <ul className="space-y-2 text-sm text-left">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const hasFeature = plan.features[key as keyof typeof plan.features];
                    return (
                      <li 
                        key={key} 
                        className={cn(
                          "flex items-center gap-2",
                          !hasFeature && "text-muted-foreground"
                        )}
                      >
                        {hasFeature ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : planKey === "free" ? (
                  subscribed ? (
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      onClick={openPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Downgrade
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  )
                ) : (
                  <Button 
                    className="w-full"
                    variant={isPro ? "default" : "secondary"}
                    disabled={checkoutLoading}
                    onClick={() => handleSelectPlan(planKey)}
                  >
                    {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {subscribed ? "Switch Plan" : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        All plans include core features: Dashboard, Properties, Tenants, Payments, and Documents management.
        <br />
        Payments are processed securely via Stripe in Nigerian Naira (₦).
      </p>
    </div>
  );
}
