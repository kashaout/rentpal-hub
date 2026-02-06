import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/lib/formatCurrency";
import { PropertyFinancials } from "@/hooks/useFinancialData";

interface PropertyProfitabilityTableProps {
  properties: PropertyFinancials[] | undefined;
  isLoading: boolean;
}

function getProfitabilityBadge(score: number) {
  if (score >= 70) {
    return { label: "Profitable", variant: "success" as const, icon: CheckCircle };
  }
  if (score >= 40) {
    return { label: "Moderate", variant: "warning" as const, icon: TrendingUp };
  }
  return { label: "Underperforming", variant: "destructive" as const, icon: AlertCircle };
}

export function PropertyProfitabilityTable({
  properties,
  isLoading,
}: PropertyProfitabilityTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Property P&L
          </h3>
          <p className="text-sm text-muted-foreground">
            Profitability analysis by property
          </p>
        </div>
        <div className="animate-pulse space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  const sortedProperties = [...(properties || [])].sort(
    (a, b) => b.profitabilityScore - a.profitabilityScore
  );

  return (
    <div className="rounded-xl border bg-card">
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Property P&L
        </h3>
        <p className="text-sm text-muted-foreground">
          Profitability analysis by property
        </p>
      </div>
      {sortedProperties.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Profit</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProperties.map((property) => {
              const badge = getProfitabilityBadge(property.profitabilityScore);
              const BadgeIcon = badge.icon;
              return (
                <TableRow key={property.propertyId}>
                  <TableCell className="font-medium">
                    {property.propertyName}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(property.revenue, "NGN", true)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(property.expenses, "NGN", true)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      property.netProfit >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {property.netProfit >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatCurrency(property.netProfit, "NGN", true)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(property.roi)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(property.occupancy)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badge.variant === "success" ? "default" : badge.variant === "warning" ? "secondary" : "destructive"}
                      className="gap-1"
                    >
                      <BadgeIcon className="h-3 w-3" />
                      {badge.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
          <h4 className="mt-3 font-medium text-foreground">No properties yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Add properties to see profitability analysis
          </p>
        </div>
      )}
    </div>
  );
}
