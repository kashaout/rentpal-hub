import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialMetricsGrid } from "./FinancialMetricsGrid";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { PropertyProfitabilityTable } from "./PropertyProfitabilityTable";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { usePortfolioMetrics, usePropertyFinancials } from "@/hooks/useFinancialData";

export function FinanceDashboard() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const { data: metrics, isLoading: metricsLoading } = usePortfolioMetrics();
  const { data: propertyFinancials, isLoading: financialsLoading } = usePropertyFinancials();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Financial Intelligence
          </h2>
          <p className="text-muted-foreground">
            Real-time P&L, cashflow, and portfolio analytics
          </p>
        </div>
        <Button
          onClick={() => setTransactionDialogOpen(true)}
          className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Record Transaction
        </Button>
      </div>

      {/* Metrics Grid */}
      <FinancialMetricsGrid metrics={metrics} isLoading={metricsLoading} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PropertyProfitabilityTable
            properties={propertyFinancials}
            isLoading={financialsLoading}
          />
        </div>
        <div>
          <AIInsightsPanel />
        </div>
      </div>

      {/* Transaction Dialog */}
      <TransactionFormDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />
    </div>
  );
}
