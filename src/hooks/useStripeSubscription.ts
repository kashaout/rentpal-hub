import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type SubscriptionPlan = "free" | "basic" | "pro" | "business";

export interface StripeSubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
  isLoading: boolean;
}

// Map Stripe product IDs to plan tiers
export const STRIPE_PLAN_MAP: Record<string, { plan: SubscriptionPlan; price_id: string; product_id: string }> = {
  basic: {
    price_id: "price_1TJCAORs3ISzADV2iXpQSzDw",
    product_id: "prod_U56HhHl0McCqXL",
    plan: "basic",
  },
  pro: {
    price_id: "price_1TJCBeRs3ISzADV2Mxu3IGx4",
    product_id: "prod_U56HGz3tPG9Saz",
    plan: "pro",
  },
  business: {
    price_id: "price_1TJCBuRs3ISzADV2LolLCnr0",
    product_id: "prod_U56IV4VuqX1ZAc",
    plan: "business",
  },
};

// Reverse map: product_id -> plan
const PRODUCT_TO_PLAN: Record<string, SubscriptionPlan> = Object.fromEntries(
  Object.values(STRIPE_PLAN_MAP).map((v) => [v.product_id, v.plan])
);

export function useStripeSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeSubscriptionStatus>({
    subscribed: false,
    product_id: null,
    price_id: null,
    subscription_end: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus((s) => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setStatus({
        subscribed: data.subscribed,
        product_id: data.product_id,
        price_id: data.price_id,
        subscription_end: data.subscription_end,
        isLoading: false,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setStatus((s) => ({ ...s, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    // Auto-refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const currentPlan: SubscriptionPlan = status.product_id
    ? PRODUCT_TO_PLAN[status.product_id] || "free"
    : "free";

  return { ...status, currentPlan, refresh: checkSubscription };
}

export function useStripeCheckout() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const checkout = async (priceId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message || "Unable to start checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, isLoading };
}

export function useCustomerPortal() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const openPortal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Portal unavailable",
        description: err.message || "Unable to open billing portal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { openPortal, isLoading };
}

export function useRentPayment() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const payRent = async (params: {
    amount: number;
    currency: string;
    tenantId: string;
    propertyName?: string;
    unitNumber?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: params,
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Payment failed",
        description: err.message || "Unable to start rent payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { payRent, isLoading };
}
