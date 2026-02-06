import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Home, 
  Users, 
  Receipt, 
  Activity 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/lib/formatCurrency";
import { PortfolioMetrics } from "@/hooks/useFinancialData";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "danger";
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default" 
}: MetricCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
    danger: "bg-destructive/5 border-destructive/20",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:shadow-card-hover",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
            iconStyles[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface FinancialMetricsGridProps {
  metrics: PortfolioMetrics | undefined;
  isLoading: boolean;
}

export function FinancialMetricsGrid({ metrics, isLoading }: FinancialMetricsGridProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  const profitVariant = metrics.netProfit >= 0 ? "success" : "danger";
  const roiVariant = metrics.roi >= 5 ? "success" : metrics.roi >= 0 ? "default" : "danger";
  const occupancyVariant = metrics.occupancyRate >= 80 ? "success" : metrics.occupancyRate >= 50 ? "warning" : "danger";
  const collectionVariant = metrics.collectionRate >= 90 ? "success" : metrics.collectionRate >= 70 ? "warning" : "danger";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Net Profit"
        value={formatCurrency(metrics.netProfit, "NGN", true)}
        subtitle="Total income minus expenses"
        icon={PiggyBank}
        variant={profitVariant}
      />
      <MetricCard
        title="Monthly Cashflow"
        value={formatCurrency(metrics.cashflow, "NGN", true)}
        subtitle="This month's net flow"
        icon={Wallet}
        variant={metrics.cashflow >= 0 ? "success" : "danger"}
      />
      <MetricCard
        title="ROI"
        value={formatPercentage(metrics.roi)}
        subtitle="Return on investment"
        icon={Activity}
        variant={roiVariant}
      />
      <MetricCard
        title="Portfolio Value"
        value={formatCurrency(metrics.portfolioValue, "NGN", true)}
        subtitle="Estimated total value"
        icon={Home}
      />
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(metrics.totalRevenue, "NGN", true)}
        subtitle="All-time income"
        icon={TrendingUp}
        variant="success"
      />
      <MetricCard
        title="Total Expenses"
        value={formatCurrency(metrics.totalExpenses, "NGN", true)}
        subtitle="All-time costs"
        icon={Receipt}
        variant="warning"
      />
      <MetricCard
        title="Occupancy Rate"
        value={formatPercentage(metrics.occupancyRate)}
        subtitle="Units occupied"
        icon={Users}
        variant={occupancyVariant}
      />
      <MetricCard
        title="Collection Rate"
        value={formatPercentage(metrics.collectionRate)}
        subtitle="Payments collected"
        icon={Receipt}
        variant={collectionVariant}
      />
    </div>
  );
}
