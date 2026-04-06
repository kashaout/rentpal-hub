import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, ShieldCheck, Wrench, ArrowLeftRight, FileText } from "lucide-react";
import { FinancialMetricsGrid } from "./FinancialMetricsGrid";
import { usePortfolioMetrics } from "@/hooks/useFinancialData";
import { RentReceivedTab } from "./tabs/RentReceivedTab";
import { EscrowTab } from "./tabs/EscrowTab";
import { ExpensesTab } from "./tabs/ExpensesTab";
import { TransactionsTab } from "./tabs/TransactionsTab";
import { StatementsTab } from "./tabs/StatementsTab";

export function FinanceDashboard() {
  const { data: metrics, isLoading: metricsLoading } = usePortfolioMetrics();

  return (
    <div className="space-y-6">
      <FinancialMetricsGrid metrics={metrics} isLoading={metricsLoading} />

      <Tabs defaultValue="rent" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="rent" className="gap-2 flex-1 min-w-[120px]">
            <Banknote className="h-4 w-4" /> Rent Received
          </TabsTrigger>
          <TabsTrigger value="escrow" className="gap-2 flex-1 min-w-[120px]">
            <ShieldCheck className="h-4 w-4" /> Escrow
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 flex-1 min-w-[120px]">
            <Wrench className="h-4 w-4" /> Expenses
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 flex-1 min-w-[120px]">
            <ArrowLeftRight className="h-4 w-4" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="statements" className="gap-2 flex-1 min-w-[120px]">
            <FileText className="h-4 w-4" /> Statements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rent"><RentReceivedTab /></TabsContent>
        <TabsContent value="escrow"><EscrowTab /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="transactions"><TransactionsTab /></TabsContent>
        <TabsContent value="statements"><StatementsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
