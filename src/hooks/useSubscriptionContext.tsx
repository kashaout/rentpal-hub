import { createContext, useContext, ReactNode, useMemo } from "react";
import { useSubscription, PLAN_CONFIGS, SubscriptionPlan, SubscriptionFeatures } from "@/hooks/useSubscription";
import { useCanAddProperty } from "@/hooks/useSubscription";
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

  const value = useMemo<SubscriptionContextType>(() => {
    const plan = subscription?.plan || "free";
    const isActive = subscription?.is_active ?? true;
    const isExpired = subscription?.expires_at
      ? new Date(subscription.expires_at) < new Date()
      : false;
    const features = subscription?.features || PLAN_CONFIGS.free.features;

    // Tenants, maintenance, vendors, and admins are not subject to subscription enforcement
    const isExempt = isTenant || isMaintenance || isVendor || isAdmin;
    const isReadOnly = !isExempt && (!isActive || isExpired);
    const needsSubscription = false; // Free plan is always available

    return {
      plan,
      planName: PLAN_CONFIGS[plan]?.name || "Free",
      isActive: isActive && !isExpired,
      isExpired,
      isReadOnly,
      propertyLimit: subscription?.property_limit || 1,
      propertyCount: (propertyData && typeof propertyData === "object" && "currentCount" in propertyData) ? propertyData.currentCount : 0,
      canAddProperty: isExempt || ((propertyData && typeof propertyData === "object" && "canAdd" in propertyData) ? propertyData.canAdd : true),
      features,
      hasFeature: (feature: keyof SubscriptionFeatures) => {
        if (isExempt) return true;
        return features?.[feature] ?? false;
      },
      isLoading: subLoading || propLoading,
      needsSubscription,
    };
  }, [subscription, propertyData, subLoading, propLoading, isTenant, isMaintenance, isVendor, isAdmin]);

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
