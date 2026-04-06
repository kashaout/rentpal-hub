import { createContext, useContext, ReactNode, useMemo } from "react";
import { useSubscription, PLAN_CONFIGS, SubscriptionPlan, SubscriptionFeatures } from "@/hooks/useSubscription";
import { useCanAddProperty } from "@/hooks/useSubscription";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  planName: string;
  isActive: boolean;
  isExpired: boolean;
  isReadOnly: boolean;
  propertyLimit: number;
  propertyCount: number;
  canAddProperty: boolean;
  features: SubscriptionFeatures;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  isLoading: boolean;
  needsSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isTenant, isMaintenance, isVendor, isAdmin } = useAuth();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: propertyData, isLoading: propLoading } = useCanAddProperty();
  const { currentPlan: stripePlan, subscribed: stripeSubscribed, isLoading: stripeLoading } = useStripeSubscription();

  const value = useMemo<SubscriptionContextType>(() => {
    // Prefer Stripe as source of truth when it reports an active subscription
    const dbPlan = subscription?.plan || "free";
    const plan: SubscriptionPlan = stripeSubscribed ? stripePlan : dbPlan;
    const planConfig = PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;

    const isActive = stripeSubscribed || (subscription?.is_active ?? true);
    const isExpired = !stripeSubscribed && subscription?.expires_at
      ? new Date(subscription.expires_at) < new Date()
      : false;
    const features = planConfig.features;

    // Tenants, maintenance, vendors, and admins are not subject to subscription enforcement
    const isExempt = isTenant || isMaintenance || isVendor || isAdmin;
    const isReadOnly = !isExempt && (!isActive || isExpired);
    const needsSubscription = false; // Free plan is always available

    const propertyLimit = planConfig.property_limit;

    return {
      plan,
      planName: planConfig.name || "Free",
      isActive: isActive && !isExpired,
      isExpired,
      isReadOnly,
      propertyLimit,
      propertyCount: (propertyData && typeof propertyData === "object" && "currentCount" in propertyData) ? propertyData.currentCount : 0,
      canAddProperty: isExempt || ((propertyData && typeof propertyData === "object" && "canAdd" in propertyData) ? propertyData.canAdd : true),
      features,
      hasFeature: (feature: keyof SubscriptionFeatures) => {
        if (isExempt) return true;
        return features?.[feature] ?? false;
      },
      isLoading: subLoading || propLoading || stripeLoading,
      needsSubscription,
    };
  }, [subscription, propertyData, subLoading, propLoading, isTenant, isMaintenance, isVendor, isAdmin, stripePlan, stripeSubscribed, stripeLoading]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscriptionContext must be used within SubscriptionProvider");
  }
  return context;
}
