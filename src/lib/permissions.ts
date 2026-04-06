/**
 * Centralized permission utility for plan, role, and archive checks.
 * Use these helpers throughout the app for consistent access control.
 */

import type { SubscriptionFeatures, SubscriptionPlan } from "@/hooks/useSubscription";

type AppRole = "admin" | "consultant" | "landlord" | "tenant" | "maintenance" | "vendor";

// ── Role checks ──────────────────────────────────────────────

export function isManagerRole(roles: AppRole[]): boolean {
  return roles.some(r => ["admin", "consultant", "landlord"].includes(r));
}

export function isTenantOnly(roles: AppRole[]): boolean {
  return roles.includes("tenant") && !roles.some(r => ["admin", "consultant", "landlord", "maintenance", "vendor"].includes(r));
}

export function isMaintenanceOnly(roles: AppRole[]): boolean {
  return roles.some(r => ["maintenance", "vendor"].includes(r)) && !roles.some(r => ["admin", "consultant", "landlord", "tenant"].includes(r));
}

export function isSubscriptionExempt(roles: AppRole[]): boolean {
  return roles.some(r => ["tenant", "maintenance", "vendor", "admin"].includes(r));
}

// ── Feature access ───────────────────────────────────────────

export const PLAN_FEATURE_MAP: Record<string, SubscriptionPlan[]> = {
  maintenance: ["basic", "pro", "business"],
  financials: ["pro", "business"],
  reports: ["pro", "business"],
  consultants: ["business"],
  automation_workflows: ["business"],
  ai_insights: ["business"],
  advanced_reports: ["pro", "business"],
  compliance_tracker: ["basic", "pro", "business"],
  multi_user: ["pro", "business"],
};

export function canAccessFeature(
  feature: keyof SubscriptionFeatures,
  plan: SubscriptionPlan,
  roles: AppRole[]
): boolean {
  if (isSubscriptionExempt(roles)) return true;
  const allowedPlans = PLAN_FEATURE_MAP[feature];
  return allowedPlans ? allowedPlans.includes(plan) : false;
}

export function getRequiredPlanForFeature(feature: keyof SubscriptionFeatures): string {
  const plans = PLAN_FEATURE_MAP[feature];
  if (!plans?.length) return "Business";
  const nameMap: Record<string, string> = { basic: "Starter", pro: "Pro", business: "Business" };
  return nameMap[plans[0]] || "Starter";
}

// ── Navigation visibility ────────────────────────────────────

export interface NavVisibility {
  dashboard: boolean;
  properties: boolean;
  tenants: boolean;
  maintenance: boolean;
  finance: boolean;
  reports: boolean;
  manageUsers: boolean;
}

export function getNavVisibility(
  roles: AppRole[],
  features: SubscriptionFeatures,
  plan: SubscriptionPlan
): NavVisibility {
  const manager = isManagerRole(roles);
  const exempt = isSubscriptionExempt(roles);

  return {
    dashboard: manager,
    properties: manager,
    tenants: manager,
    maintenance: manager && (exempt || canAccessFeature("maintenance", plan, roles)),
    finance: manager && (exempt || canAccessFeature("financials", plan, roles)),
    reports: manager && (exempt || canAccessFeature("reports", plan, roles)),
    manageUsers: roles.includes("admin") || roles.includes("landlord"),
  };
}

// ── Archive safety checks ────────────────────────────────────

export interface ArchiveCheckResult {
  canArchive: boolean;
  reason?: string;
  dependentCounts?: Record<string, number>;
}

/**
 * Check whether an entity can be safely archived.
 * Returns a reason if it cannot, plus dependent record counts.
 */
export function buildArchiveWarning(
  entityType: "property" | "tenant",
  counts: Record<string, number>
): ArchiveCheckResult {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  if (total === 0) {
    return { canArchive: true, dependentCounts: counts };
  }

  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`);

  return {
    canArchive: true, // still allow but with warning
    reason: `This ${entityType} has ${parts.join(", ")}. Archiving will hide it from active views but preserve all related data.`,
    dependentCounts: counts,
  };
}

// ── Validation helpers ───────────────────────────────────────

export function validateRentAmount(amount: number, currency = "NGN"): string | null {
  if (amount <= 0) return "Rent amount must be greater than zero.";
  if (currency === "NGN" && amount < 1000) return "Minimum rent for NGN is ₦1,000.";
  if (amount > 100_000_000) return "Rent amount exceeds maximum allowed.";
  return null;
}

export function validateLeaseDate(start: string, end: string): string | null {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime())) return "Invalid start date.";
  if (isNaN(e.getTime())) return "Invalid end date.";
  if (e <= s) return "Lease end date must be after start date.";
  const diffDays = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Lease must be at least 1 day long.";
  if (diffDays > 3650) return "Lease cannot exceed 10 years.";
  return null;
}

export function validatePaymentAmount(amount: number, rentAmount?: number): string | null {
  if (amount <= 0) return "Payment amount must be greater than zero.";
  if (amount > 100_000_000) return "Payment amount exceeds maximum allowed.";
  if (rentAmount && amount > rentAmount * 12) return "Payment amount seems too high. Please verify.";
  return null;
}
