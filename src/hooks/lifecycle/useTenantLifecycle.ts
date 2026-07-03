import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * CANONICAL TENANT LIFECYCLE
 * --------------------------
 * Single source of truth for the tenant journey. Every tenant page MUST
 * derive its state from this hook (or hooks scoped to a property below).
 *
 * Chain walked here:
 *   bookings (tenant_user_id)
 *     -> payments (tenant_id matched via lease_agreements.tenant_user_id)
 *     -> lease_agreements (tenant_user_id, property_id)
 *     -> properties (id) for display only
 *     -> maintenance_requests (tenant_id linked via lease/property)
 *
 * No tenant page is allowed to read these tables independently.
 */

export interface TenantPropertyLifecycle {
  property_id: string;
  property_name: string;
  property_address: string;
  property_image: string | null;

  // Booking phase
  booking_id: string | null;
  booking_status: string | null;            // pending | confirmed | cancelled | ...
  booking_payment_status: string | null;    // unpaid | pending | paid | refunded
  check_in: string | null;
  check_out: string | null;
  total_price: number;

  // Lease phase
  lease_id: string | null;
  lease_status: string | null;              // draft | pending_signature | active | ...
  unit_number: string;
  rent_amount: number;
  currency: string;
  lease_start: string | null;
  lease_end: string | null;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  fully_signed: boolean;
  credentials_sent_at: string | null;
  check_in_time: string | null;

  // Derived gating (the ONLY place these are computed)
  isPaid: boolean;                           // booking confirmed AND paid
  canShowLease: boolean;                     // lease exists
  canShowCodes: boolean;                     // both signed + credentials_sent_at + within window
  canSubmitMaintenance: boolean;             // fully signed
}

export interface TenantLifecycleSnapshot {
  isLoading: boolean;
  isError: boolean;
  /** All properties this tenant has interacted with (booking or lease) */
  properties: TenantPropertyLifecycle[];
  /** "Active" property = first fully-signed lease, else most recent booking */
  active: TenantPropertyLifecycle | null;
  /** Has the tenant ever taken any action (browse only -> false) */
  hasActivity: boolean;
}

const empty: TenantLifecycleSnapshot = {
  isLoading: false,
  isError: false,
  properties: [],
  active: null,
  hasActivity: false,
};

export function useTenantLifecycle(): TenantLifecycleSnapshot {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Realtime: refetch when bookings/leases/payments for this tenant change
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`tenant-lifecycle-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["tenant-lifecycle", userId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lease_agreements", filter: `tenant_user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["tenant-lifecycle", userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, queryClient]);

  const query = useQuery({
    queryKey: ["tenant-lifecycle", userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      if (!userId) return [] as TenantPropertyLifecycle[];

      // 1) BOOKINGS — entry point for the lifecycle chain
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, property_id, status, payment_status, check_in, check_out, total_price, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (bErr) throw bErr;

      // 2) LEASES — fully-signed and in-progress leases for this tenant
      const { data: leases, error: lErr } = await supabase
        .from("lease_agreements" as any)
        .select(
          "id, property_id, status, unit_number, rent_amount, currency, lease_start, lease_end, tenant_signed_at, landlord_signed_at, credentials_sent_at, check_in_time"
        )
        .eq("tenant_user_id", userId)
        .order("created_at", { ascending: false });
      if (lErr) throw lErr;

      // 2b) PAYMENTS — source of truth for paid status. Fetch by lease_id.
      const leaseIds = (leases ?? []).map((l: any) => l.id).filter(Boolean);
      const { data: payments } = leaseIds.length
        ? await supabase
            .from("payments")
            .select("lease_id, status")
            .in("lease_id", leaseIds)
        : { data: [] as any[] };
      const paidLeaseIds = new Set<string>(
        (payments ?? [])
          .filter((p: any) => p.status === "completed")
          .map((p: any) => p.lease_id)
      );

      // 2c) TENANTS bridge rows — fallback for payment_status where no lease payment row exists.
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("property_id, payment_status, is_archived")
        .eq("user_id", userId)
        .eq("is_archived", false);
      const paidTenantPropertyIds = new Set<string>(
        (tenantRows ?? [])
          .filter((t: any) => t.payment_status === "paid")
          .map((t: any) => t.property_id)
      );

      const propertyIds = new Set<string>();
      (bookings ?? []).forEach((b: any) => propertyIds.add(b.property_id));
      (leases ?? []).forEach((l: any) => propertyIds.add(l.property_id));

      // 3) PROPERTIES — for display only
      const { data: properties } = propertyIds.size
        ? await supabase
            .from("properties")
            .select("id, name, address, image_url")
            .in("id", Array.from(propertyIds))
        : { data: [] as any[] };
      const propMap = new Map<string, any>();
      (properties ?? []).forEach((p: any) => propMap.set(p.id, p));

      // 4) Build per-property snapshot — booking is the seed, lease overlays
      const byProperty = new Map<string, TenantPropertyLifecycle>();

      const ensureRow = (propertyId: string): TenantPropertyLifecycle => {
        const existing = byProperty.get(propertyId);
        if (existing) return existing;
        const prop = propMap.get(propertyId);
        const row: TenantPropertyLifecycle = {
          property_id: propertyId,
          property_name: prop?.name ?? "Property",
          property_address: prop?.address ?? "",
          property_image: prop?.image_url ?? null,
          booking_id: null,
          booking_status: null,
          booking_payment_status: null,
          check_in: null,
          check_out: null,
          total_price: 0,
          lease_id: null,
          lease_status: null,
          unit_number: "",
          rent_amount: 0,
          currency: "NGN",
          lease_start: null,
          lease_end: null,
          tenant_signed_at: null,
          landlord_signed_at: null,
          fully_signed: false,
          credentials_sent_at: null,
          check_in_time: null,
          isPaid: false,
          canShowLease: false,
          canShowCodes: false,
          canSubmitMaintenance: false,
        };
        byProperty.set(propertyId, row);
        return row;
      };

      // Apply most-recent booking per property
      for (const b of (bookings ?? []) as any[]) {
        const row = ensureRow(b.property_id);
        if (!row.booking_id) {
          row.booking_id = b.id;
          row.booking_status = b.status;
          row.booking_payment_status = b.payment_status;
          row.check_in = b.check_in;
          row.check_out = b.check_out;
          row.total_price = Number(b.total_price ?? 0);
        }
      }

      // Overlay most-recent lease per property
      for (const l of (leases ?? []) as any[]) {
        const row = ensureRow(l.property_id);
        if (!row.lease_id) {
          row.lease_id = l.id;
          row.lease_status = l.status;
          row.unit_number = l.unit_number ?? "";
          row.rent_amount = Number(l.rent_amount ?? 0);
          row.currency = l.currency ?? "NGN";
          row.lease_start = l.lease_start;
          row.lease_end = l.lease_end;
          row.tenant_signed_at = l.tenant_signed_at;
          row.landlord_signed_at = l.landlord_signed_at;
          row.fully_signed = !!(l.tenant_signed_at && l.landlord_signed_at);
          row.credentials_sent_at = l.credentials_sent_at;
          row.check_in_time = l.check_in_time;
        }
      }

      // Compute derived gates — the ONLY place these flags are derived in tenant UI
      for (const row of byProperty.values()) {
        row.isPaid =
          row.booking_status === "confirmed" ||
          row.booking_payment_status === "paid";
        row.canShowLease = !!row.lease_id;
        row.canSubmitMaintenance = row.fully_signed;
        // Codes: both signed + credentials provisioned. Final 12-hour window
        // gating is enforced server-side by get_lease_credentials RPC.
        row.canShowCodes =
          row.fully_signed && !!row.credentials_sent_at;
      }

      return Array.from(byProperty.values());
    },
  });

  return useMemo<TenantLifecycleSnapshot>(() => {
    if (!userId) return empty;
    const properties = query.data ?? [];
    const active =
      properties.find((p) => p.fully_signed) ??
      properties.find((p) => p.isPaid) ??
      properties[0] ??
      null;
    return {
      isLoading: query.isLoading,
      isError: query.isError,
      properties,
      active,
      hasActivity: properties.length > 0,
    };
  }, [userId, query.data, query.isLoading, query.isError]);
}

/** Convenience: scope the lifecycle to a single property the tenant interacts with. */
export function useTenantPropertyLifecycle(
  propertyId: string | null | undefined
): TenantPropertyLifecycle | null {
  const lc = useTenantLifecycle();
  if (!propertyId) return lc.active;
  return lc.properties.find((p) => p.property_id === propertyId) ?? null;
}
