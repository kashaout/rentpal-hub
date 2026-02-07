import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface ComplianceScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ComplianceScoreBadge({
  score,
  size = "md",
  showLabel = true,
}: ComplianceScoreBadgeProps) {
  const getScoreConfig = (score: number) => {
    if (score >= 90) {
      return {
        label: "Excellent",
        color: "text-success",
        bgColor: "bg-success/10",
        borderColor: "border-success/20",
        Icon: ShieldCheck,
      };
    } else if (score >= 70) {
      return {
        label: "Good",
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/20",
        Icon: Shield,
      };
    } else if (score >= 50) {
      return {
        label: "Fair",
        color: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/20",
        Icon: ShieldAlert,
      };
    } else {
      return {
        label: "Critical",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/20",
        Icon: ShieldX,
      };
    }
  };

  const config = getScoreConfig(score);
  const { Icon } = config;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{score}%</span>
      {showLabel && <span className="opacity-75">({config.label})</span>}
    </div>
  );
}
