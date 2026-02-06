import { useState } from "react";
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Lightbulb,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIInsights, useDismissInsight, useGenerateInsights, AIInsight } from "@/hooks/useAIInsights";

const severityConfig = {
  info: {
    icon: Info,
    bgClass: "bg-primary/5 border-primary/20",
    iconClass: "text-primary",
    badgeClass: "bg-primary/10 text-primary",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-warning/5 border-warning/20",
    iconClass: "text-warning",
    badgeClass: "bg-warning/10 text-warning",
  },
  critical: {
    icon: AlertCircle,
    bgClass: "bg-destructive/5 border-destructive/20",
    iconClass: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
  },
  opportunity: {
    icon: Lightbulb,
    bgClass: "bg-success/5 border-success/20",
    iconClass: "text-success",
    badgeClass: "bg-success/10 text-success",
  },
};

interface InsightCardProps {
  insight: AIInsight;
  onDismiss: (id: string) => void;
}

function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-all duration-200 hover:shadow-md",
        config.bgClass
      )}
    >
      <button
        onClick={() => onDismiss(insight.id)}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            config.badgeClass
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                config.badgeClass
              )}
            >
              {insight.insight_type}
            </span>
          </div>
          <h4 className="mt-1 font-medium text-foreground">{insight.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {insight.description}
          </p>
          {insight.action_items && insight.action_items.length > 0 && (
            <ul className="mt-2 space-y-1">
              {insight.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIInsightsPanel() {
  const { data: insights, isLoading } = useAIInsights();
  const dismissMutation = useDismissInsight();
  const generateMutation = useGenerateInsights();

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-warm">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="text-xs text-muted-foreground">
              Powered by financial intelligence
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Generate
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/30" />
          <h4 className="mt-3 font-medium text-foreground">No insights yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Click Generate to get AI-powered financial insights
          </p>
        </div>
      )}
    </div>
  );
}
