/**
 * Canonical lifecycle hooks. EVERY page should import from here.
 * Walks: properties -> bookings -> payments -> lease_agreements -> maintenance_requests
 *
 * Do NOT add new direct reads of `tenants`, `lease_agreements`, `payments`,
 * or `maintenance_requests` to UI code. Extend these hooks instead.
 */
export {
  useTenantLifecycle,
  useTenantPropertyLifecycle,
  type TenantPropertyLifecycle,
  type TenantLifecycleSnapshot,
} from "./useTenantLifecycle";

export {
  useLandlordLifecycle,
  usePropertyLifecycle,
  type LandlordPropertySummary,
  type LandlordTenantDerived,
  type LandlordMaintenanceItem,
  type LandlordPaymentItem,
  type LandlordLifecycleSnapshot,
} from "./useLandlordLifecycle";
