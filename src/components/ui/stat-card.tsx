import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "accent" | "success";
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = "default",
  className 
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-card-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}% from last month
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            variant === "accent" && "bg-accent/10 text-accent",
            variant === "success" && "bg-success/10 text-success",
            variant === "default" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full transition-all duration-300",
          variant === "accent" && "bg-gradient-warm opacity-50 group-hover:opacity-100",
          variant === "success" && "bg-success opacity-50 group-hover:opacity-100",
          variant === "default" && "bg-primary opacity-50 group-hover:opacity-100"
        )}
      />
    </div>
  );
}
