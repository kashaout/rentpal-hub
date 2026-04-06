import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";
import type { Json } from "@/integrations/supabase/types";

export type SubscriptionPlan = "free" | "basic" | "pro" | "business";

export interface SubscriptionFeatures {
  compliance_tracker: boolean;
  automation_workflows: boolean;
  advanced_reports: boolean;
  ai_insights: boolean;
  multi_user: boolean;
  maintenance: boolean;
  financials: boolean;
  reports: boolean;
  consultants: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  property_limit: number;
  features: SubscriptionFeatures;
  started_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, {
  name: string;
  price: number;
  property_limit: number;
  features: SubscriptionFeatures;
  description: string;
}> = {
  free: {
    name: "Free",
    price: 0,
    property_limit: 1,
    features: {
      compliance_tracker: false,
      automation_workflows: false,
      advanced_reports: false,
      ai_insights: false,
      multi_user: false,
      maintenance: false,
      financials: false,
      reports: false,
      consultants: false,
    },
    description: "Perfect for getting started with basic property management",
  },
  basic: {
    name: "Starter",
    price: 20000,
    property_limit: 10,
    features: {
      compliance_tracker: true,
      automation_workflows: false,
      advanced_reports: false,
      ai_insights: false,
      multi_user: false,
      maintenance: true,
      financials: false,
      reports: false,
      consultants: false,
    },
    description: "Essential features for small landlords",
  },
  pro: {
    name: "Pro",
    price: 40000,
    property_limit: 50,
    features: {
      compliance_tracker: true,
      automation_workflows: false,
      advanced_reports: true,
      ai_insights: false,
      multi_user: true,
      maintenance: true,
      financials: true,
      reports: true,
      consultants: false,
    },
    description: "Advanced features for growing portfolios",
  },
  business: {
    name: "Business",
    price: 65000,
    property_limit: 999,
    features: {
      compliance_tracker: true,
      automation_workflows: true,
      advanced_reports: true,
      ai_insights: true,
      multi_user: true,
      maintenance: true,
      financials: true,
      reports: true,
      consultants: true,
    },
    description: "Full-featured solution for property management companies",
  },
};

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Return default free subscription if none exists
      if (!data) {
        return {
          id: "",
          user_id: user.id,
          plan: "free" as SubscriptionPlan,
          property_limit: 1,
          features: PLAN_CONFIGS.free.features,
          started_at: new Date().toISOString(),
          expires_at: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Subscription;
      }

      return {
        ...data,
        features: data.features as unknown as SubscriptionFeatures,
      } as Subscription;
    },
    enabled: !!user,
  });
}

export function useCreateOrUpdateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      if (!user) throw new Error("Not authenticated");

      const planConfig = PLAN_CONFIGS[plan];
      
      // Check if subscription exists
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("subscriptions")
          .update({
            plan,
            property_limit: planConfig.property_limit,
            features: JSON.parse(JSON.stringify(planConfig.features)) as Json,
          })
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("subscriptions")
          .insert([{
            user_id: user.id,
            plan,
            property_limit: planConfig.property_limit,
            features: JSON.parse(JSON.stringify(planConfig.features)) as Json,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, plan) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast({
        title: "Plan updated!",
        description: `You are now on the ${PLAN_CONFIGS[plan].name} plan.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update plan",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useCanAddProperty() {
  const { data: subscription } = useSubscription();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["can-add-property", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .or(`landlord_id.eq.${user.id}`);

      if (error) throw error;

      const propertyCount = count || 0;
      const limit = subscription?.property_limit || 1;

      return {
        canAdd: propertyCount < limit,
        currentCount: propertyCount,
        limit,
      };
    },
    enabled: !!user && !!subscription,
  });
}

export function useHasFeature(feature: keyof SubscriptionFeatures) {
  const { data: subscription, isLoading } = useSubscription();
  
  return {
    hasFeature: subscription?.features?.[feature] ?? false,
    isLoading,
    plan: subscription?.plan,
  };
}
