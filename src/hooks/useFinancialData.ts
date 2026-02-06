import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeErrorMessage } from "@/lib/errorUtils";

export interface FinancialTransaction {
  id: string;
  property_id: string;
  tenant_id: string | null;
  type: "income" | "expense";
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  payment_method: string | null;
  reference_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  occupancyRate: number;
  collectionRate: number;
  portfolioValue: number;
  cashflow: number;
}

export interface PropertyFinancials {
  propertyId: string;
  propertyName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  roi: number;
  occupancy: number;
  profitabilityScore: number;
}

export interface CreateTransactionData {
  property_id: string;
  tenant_id?: string | null;
  type: "income" | "expense";
  category: string;
  amount: number;
  currency?: string;
  description?: string;
  transaction_date?: string;
  payment_method?: string;
  reference_number?: string;
}

const INCOME_CATEGORIES = [
  "Rent",
  "Service Charge",
  "Utility Reimbursement",
  "Late Fee",
  "Security Deposit",
  "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Maintenance",
  "Repairs",
  "Property Tax",
  "Insurance",
  "Utilities",
  "Management Fee",
  "Legal",
  "Marketing",
  "Cleaning",
  "Security",
  "Other Expense",
];

export function useFinancialTransactions(propertyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-transactions", user?.id, propertyId],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!user,
  });
}

export function usePortfolioMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["portfolio-metrics", user?.id],
    queryFn: async () => {
      // Fetch all properties with their financial data
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("*");

      if (propError) throw propError;

      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from("financial_transactions")
        .select("*");

      if (txError) throw txError;

      // Fetch all tenants for occupancy calculation
      const { data: tenants, error: tenantError } = await supabase
        .from("tenants")
        .select("*");

      if (tenantError) throw tenantError;

      // Fetch all payments for collection rate
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("*");

      if (paymentError) throw paymentError;

      // Calculate metrics
      const totalRevenue = (transactions || [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpenses = (transactions || [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netProfit = totalRevenue - totalExpenses;

      const portfolioValue = (properties || []).reduce(
        (sum, p) => sum + Number(p.current_value || p.monthly_rent * 12 * 10),
        0
      );

      const acquisitionCost = (properties || []).reduce(
        (sum, p) => sum + Number(p.acquisition_cost || p.monthly_rent * 12 * 8),
        0
      );

      const roi = acquisitionCost > 0 ? (netProfit / acquisitionCost) * 100 : 0;

      // Calculate occupancy rate
      const totalUnits = (properties || []).reduce((sum, p) => sum + p.units, 0);
      const occupiedUnits = tenants?.length || 0;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      // Calculate collection rate (paid vs total due)
      const paidPayments = (payments || []).filter((p) => p.status === "completed");
      const totalPayments = payments?.length || 0;
      const collectionRate = totalPayments > 0 
        ? (paidPayments.length / totalPayments) * 100 
        : 100;

      // Monthly cashflow (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = (transactions || []).filter(
        (t) => new Date(t.transaction_date) >= startOfMonth
      );
      const monthlyIncome = monthlyTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const monthlyExpenses = monthlyTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const cashflow = monthlyIncome - monthlyExpenses;

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        roi,
        occupancyRate,
        collectionRate,
        portfolioValue,
        cashflow,
      } as PortfolioMetrics;
    },
    enabled: !!user,
  });
}

export function usePropertyFinancials() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-financials", user?.id],
    queryFn: async () => {
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("*");

      if (propError) throw propError;

      const { data: transactions, error: txError } = await supabase
        .from("financial_transactions")
        .select("*");

      if (txError) throw txError;

      const { data: tenants, error: tenantError } = await supabase
        .from("tenants")
        .select("*");

      if (tenantError) throw tenantError;

      return (properties || []).map((property) => {
        const propertyTx = (transactions || []).filter(
          (t) => t.property_id === property.id
        );
        const revenue = propertyTx
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = propertyTx
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const netProfit = revenue - expenses;

        const cost = Number(property.acquisition_cost) || Number(property.monthly_rent) * 12 * 8;
        const roi = cost > 0 ? (netProfit / cost) * 100 : 0;

        const propertyTenants = (tenants || []).filter(
          (t) => t.property_id === property.id
        );
        const occupancy = property.units > 0 
          ? (propertyTenants.length / property.units) * 100 
          : 0;

        // Profitability score (0-100)
        const profitabilityScore = Math.min(
          100,
          Math.max(0, (roi * 2) + (occupancy * 0.5) + (netProfit > 0 ? 20 : 0))
        );

        return {
          propertyId: property.id,
          propertyName: property.name,
          revenue,
          expenses,
          netProfit,
          roi,
          occupancy,
          profitabilityScore,
        } as PropertyFinancials;
      });
    },
    enabled: !!user,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      const { data: transaction, error } = await supabase
        .from("financial_transactions")
        .insert({
          ...data,
          currency: data.currency || "NGN",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["property-financials"] });
      toast({ title: "Transaction recorded successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record transaction",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["property-financials"] });
      toast({ title: "Transaction deleted!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete transaction",
        description: sanitizeErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export { INCOME_CATEGORIES, EXPENSE_CATEGORIES };
