import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface AIInsight {
  id: string;
  user_id: string;
  property_id: string | null;
  insight_type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical" | "opportunity";
  action_items: string[];
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useAIInsights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return (data || []).map((insight) => ({
        ...insight,
        action_items: Array.isArray(insight.action_items) 
          ? insight.action_items 
          : [],
      })) as AIInsight[];
    },
    enabled: !!user,
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_insights")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to dismiss insight",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useGenerateInsights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
      toast({ title: "AI insights generated!" });
    },
    onError: (error: Error) => {
      if (error.message?.includes("429")) {
        toast({
          title: "Rate limit exceeded",
          description: "Please try again in a few moments.",
          variant: "destructive",
        });
      } else if (error.message?.includes("402")) {
        toast({
          title: "AI credits exhausted",
          description: "Please add credits to continue using AI features.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to generate insights",
          description: sanitizeErrorMessage(error),
          variant: "destructive",
        });
      }
    },
  });
}
