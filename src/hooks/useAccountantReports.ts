import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isWithinInterval, parseISO } from "date-fns";

export interface ReportDateRange {
  from: Date;
  to: Date;
}

export interface IncomeStatementRow {
  date: string;
  property: string;
  category: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
}

export interface RentRollRow {
  property: string;
  unit: string;
  tenant: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  paidThisPeriod: number;
  outstanding: number;
}

export interface ExpenseLedgerRow {
  date: string;
  property: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
}

export interface EscrowReconciliationRow {
  date: string;
  booking: string;
  tenant: string;
  amountHeld: number;
  amountReleased: number;
  status: string;
  stripeRef: string;
}

export function useIncomeStatement(range: ReportDateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-income-statement", user?.id, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .gte("transaction_date", range.from.toISOString().split("T")[0])
        .lte("transaction_date", range.to.toISOString().split("T")[0])
        .order("transaction_date", { ascending: true });
      if (error) throw error;

      const { data: properties } = await supabase.from("properties").select("id, name");
      const propMap = new Map((properties || []).map((p) => [p.id, p.name]));

      let runningBalance = 0;
      const rows: IncomeStatementRow[] = (transactions || []).map((t) => {
        const income = t.type === "income" ? Number(t.amount) : 0;
        const expense = t.type === "expense" ? Number(t.amount) : 0;
        runningBalance += income - expense;
        return {
          date: t.transaction_date,
          property: propMap.get(t.property_id) || "Unknown",
          category: t.category,
          description: t.description || "",
          income,
          expense,
          balance: runningBalance,
        };
      });

      const totalIncome = rows.reduce((s, r) => s + r.income, 0);
      const totalExpense = rows.reduce((s, r) => s + r.expense, 0);

      // Group by category for summary
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};
      rows.forEach((r) => {
        if (r.income > 0) incomeByCategory[r.category] = (incomeByCategory[r.category] || 0) + r.income;
        if (r.expense > 0) expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + r.expense;
      });

      return { rows, totalIncome, totalExpense, netProfit: totalIncome - totalExpense, incomeByCategory, expenseByCategory };
    },
    enabled: !!user,
  });
}

export function useRentRoll(range: ReportDateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-rent-roll", user?.id, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data: leases, error: leaseErr } = await supabase
        .from("lease_agreements")
        .select("*")
        .in("status", ["active", "pending_signature"]);
      if (leaseErr) throw leaseErr;

      const { data: properties } = await supabase.from("properties").select("id, name");
      const propMap = new Map((properties || []).map((p) => [p.id, p.name]));

      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "completed")
        .gte("payment_date", range.from.toISOString().split("T")[0])
        .lte("payment_date", range.to.toISOString().split("T")[0]);

      // Also get tenants for fallback
      const { data: tenants } = await supabase.from("tenants").select("*").eq("is_archived", false);

      const rows: RentRollRow[] = [];

      // From leases
      (leases || []).forEach((la) => {
        const leasePayments = (payments || []).filter((p) => p.lease_id === la.id);
        const paidThisPeriod = leasePayments.reduce((s, p) => s + Number(p.amount), 0);
        // Estimate months in range
        const rangeMonths = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const expected = la.rent_amount * rangeMonths;
        rows.push({
          property: propMap.get(la.property_id) || "Unknown",
          unit: la.unit_number,
          tenant: la.tenant_name,
          leaseStart: la.lease_start,
          leaseEnd: la.lease_end,
          monthlyRent: la.rent_amount,
          paidThisPeriod,
          outstanding: Math.max(0, expected - paidThisPeriod),
        });
      });

      // From tenants without leases
      (tenants || []).forEach((t) => {
        const hasLease = (leases || []).some(
          (la) => la.property_id === t.property_id && la.unit_number === t.unit_number
        );
        if (!hasLease) {
          const tenantPayments = (payments || []).filter((p) => p.tenant_id === t.id);
          const paidThisPeriod = tenantPayments.reduce((s, p) => s + Number(p.amount), 0);
          const rangeMonths = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          const expected = t.rent_amount * rangeMonths;
          rows.push({
            property: propMap.get(t.property_id) || "Unknown",
            unit: t.unit_number,
            tenant: `Tenant ${t.unit_number}`,
            leaseStart: t.lease_start,
            leaseEnd: t.lease_end,
            monthlyRent: t.rent_amount,
            paidThisPeriod,
            outstanding: Math.max(0, expected - paidThisPeriod),
          });
        }
      });

      const totalMonthlyRent = rows.reduce((s, r) => s + r.monthlyRent, 0);
      const totalPaid = rows.reduce((s, r) => s + r.paidThisPeriod, 0);
      const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

      return { rows, totalMonthlyRent, totalPaid, totalOutstanding };
    },
    enabled: !!user,
  });
}

export function useExpenseLedger(range: ReportDateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-expense-ledger", user?.id, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("type", "expense")
        .gte("transaction_date", range.from.toISOString().split("T")[0])
        .lte("transaction_date", range.to.toISOString().split("T")[0])
        .order("transaction_date", { ascending: true });
      if (error) throw error;

      const { data: properties } = await supabase.from("properties").select("id, name");
      const propMap = new Map((properties || []).map((p) => [p.id, p.name]));

      const rows: ExpenseLedgerRow[] = (transactions || []).map((t) => ({
        date: t.transaction_date,
        property: propMap.get(t.property_id) || "Unknown",
        category: t.category,
        vendor: t.payment_method || "N/A",
        description: t.description || "",
        amount: Number(t.amount),
      }));

      const totalExpenses = rows.reduce((s, r) => s + r.amount, 0);
      const byCategory: Record<string, number> = {};
      rows.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + r.amount; });

      return { rows, totalExpenses, byCategory };
    },
    enabled: !!user,
  });
}

export function useEscrowReconciliation(range: ReportDateRange) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-escrow", user?.id, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data: escrows, error } = await supabase
        .from("escrow_transactions")
        .select("*")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));

      const rows: EscrowReconciliationRow[] = (escrows || []).map((e) => ({
        date: e.created_at.split("T")[0],
        booking: e.booking_id || "N/A",
        tenant: profileMap.get(e.tenant_user_id) || "Unknown",
        amountHeld: e.transaction_type === "hold" ? Number(e.amount) : 0,
        amountReleased: e.transaction_type === "release" || e.transaction_type === "payout" ? Number(e.amount) : 0,
        status: e.status,
        stripeRef: e.stripe_payment_intent_id || e.stripe_transfer_id || "N/A",
      }));

      const totalHeld = rows.reduce((s, r) => s + r.amountHeld, 0);
      const totalReleased = rows.reduce((s, r) => s + r.amountReleased, 0);

      return { rows, totalHeld, totalReleased, netHeld: totalHeld - totalReleased };
    },
    enabled: !!user,
  });
}
