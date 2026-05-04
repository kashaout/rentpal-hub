import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * CANONICAL LANDLORD LIFECYCLE
 * ----------------------------
 * Drives every landlord-facing screen (Dashboard, Tenants page,
 * Maintenance, Financials, Reports, PropertyCommandCenter). Walks:
 *
 *   properties (landlord_id)
 *     -> bookings (property_id)
 *     -> payments (property_id)
 *     -> lease_agreements (landlord_user_id, property_id)
 *     -> maintenance_requests (property_id)
 *
 * Tenants are DERIVED from the lease_agreements / bookings chain, never
 * read from the legacy `tenants` table.
 */

export interface LandlordPropertySummary {
  property_id: string;
  property_name: string;
  property_address: string;
  property_image: string | null;
  units: number;
  monthly_rent: number;
  is_archived: boolean;
  is_paused: boolean;
  is_public: boolean;
  // Extended fields needed by property cards / forms
  currency: string;
  region: string;
  property_type: string;
  listing_type: string;
  description: string | null;
  amenities: string[];
  acquisition_cost: number | null;
  current_value: number | null;
  annual_expenses: number | null;
  landlord_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandlordTenantDerived {
  /** lease_agreement.id when fully signed, else booking.id */
  id: string;
  source: "lease" | "booking";
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_user_id: string | null;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent_amount: number;
  currency: string;
  lease_start: string | null;
  lease_end: string | null;
  payment_status: "paid" | "pending" | "overdue";
  fully_signed: boolean;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  booking_status: string | null;
}

export interface LandlordMaintenanceItem {
  id: string;
  property_id: string;
  property_name: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  tenant_id: string;
  photo_urls: string[] | null;
  rating: number | null;
}

export interface LandlordPaymentItem {
  id: string;
  property_id: string | null;
  property_name: string;
  tenant_id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
}

export interface LandlordLifecycleSnapshot {
  isLoading: boolean;
  isError: boolean;
  properties: LandlordPropertySummary[];
  /** All bookings across landlord's properties */
  bookings: Array<{
    id: string;
    property_id: string;
    user_id: string;
    status: string;
    payment_status: string;
    check_in: string;
    check_out: string;
    total_price: number;
    created_at: string;
  }>;
  /** All lease agreements where I am the landlord */
  leases: Array<{
    id: string;
    property_id: string;
    tenant_user_id: string;
    tenant_name: string;
    unit_number: string;
    rent_amount: number;
    currency: string;
    lease_start: string;
    lease_end: string;
    tenant_signed_at: string | null;
    landlord_signed_at: string | null;
    status: string;
  }>;
  /** Tenants derived from the chain (never from `tenants` table) */
  tenants: LandlordTenantDerived[];
  maintenance: LandlordMaintenanceItem[];
  payments: LandlordPaymentItem[];
}

const empty: LandlordLifecycleSnapshot = {
  isLoading: false,
  isError: false,
  properties: [],
  bookings: [],
  leases: [],
  tenants: [],
  maintenance: [],
  payments: [],
};

export function useLandlordLifecycle(): LandlordLifecycleSnapshot {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`landlord-lifecycle-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lease_agreements", filter: `landlord_user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["landlord-lifecycle", userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, queryClient]);

  const query = useQuery({
    queryKey: ["landlord-lifecycle", userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      if (!userId) return null;

      // Detect admin to fetch ALL properties via SECURITY DEFINER RPC.
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");

      // 1) PROPERTIES — admins see all via RPC, landlords see their own.
      let props: any[] | null = null;
      if (isAdmin) {
        const { data, error } = await supabase.rpc("rpc_admin_all_properties" as any);
        if (error) throw error;
        props = (data as any[]) ?? [];
      } else {
        const { data, error: pErr } = await supabase
          .from("properties")
          .select(
            "id, name, address, image_url, units, monthly_rent, is_archived, is_paused, is_public, currency, region, property_type, listing_type, description, amenities, acquisition_cost, current_value, annual_expenses, landlord_id, created_at, updated_at"
          )
          .eq("landlord_id", userId)
          .eq("is_archived", false)
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;
        props = data ?? [];
      }
      // Filter archived for admin view too
      props = (props ?? []).filter((p: any) => !p.is_archived);

      const propIds = (props ?? []).map((p: any) => p.id);
      const propMap = new Map<string, any>();
      (props ?? []).forEach((p: any) => propMap.set(p.id, p));

      if (propIds.length === 0) {
        return {
          properties: [],
          bookings: [],
          leases: [],
          payments: [],
          maintenance: [],
          profiles: new Map(),
        };
      }

      // 2) BOOKINGS for those properties
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, property_id, user_id, status, payment_status, check_in, check_out, total_price, created_at")
        .in("property_id", propIds)
        .order("created_at", { ascending: false });
      if (bErr) throw bErr;

      // 3) LEASE AGREEMENTS where I'm the landlord
      const { data: leases, error: lErr } = await supabase
        .from("lease_agreements" as any)
        .select(
          "id, property_id, tenant_user_id, tenant_name, unit_number, rent_amount, currency, lease_start, lease_end, tenant_signed_at, landlord_signed_at, status"
        )
        .eq("landlord_user_id", userId)
        .order("created_at", { ascending: false });
      if (lErr) throw lErr;

      // 4) PAYMENTS via property_id (chain-correct)
      const { data: payments } = await supabase
        .from("payments")
        .select("id, property_id, tenant_id, amount, status, payment_date, payment_method, notes")
        .in("property_id", propIds)
        .order("payment_date", { ascending: false });

      // 5) MAINTENANCE REQUESTS for those properties
      const { data: maintenance } = await supabase
        .from("maintenance_requests")
        .select(
          "id, property_id, tenant_id, title, description, priority, status, created_at, updated_at, resolved_at, assigned_to, photo_urls, rating"
        )
        .in("property_id", propIds)
        .order("created_at", { ascending: false });

      // Profiles for tenant names/contacts (batched)
      const tenantUserIds = new Set<string>();
      (bookings ?? []).forEach((b: any) => b.user_id && tenantUserIds.add(b.user_id));
      (leases ?? []).forEach((l: any) => l.tenant_user_id && tenantUserIds.add(l.tenant_user_id));

      const { data: profiles } = tenantUserIds.size
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone")
            .in("user_id", Array.from(tenantUserIds))
        : { data: [] as any[] };
      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

      return {
        properties: props ?? [],
        bookings: bookings ?? [],
        leases: leases ?? [],
        payments: payments ?? [],
        maintenance: maintenance ?? [],
        profiles: profileMap,
        propMap,
      };
    },
  });

  return useMemo<LandlordLifecycleSnapshot>(() => {
    if (!userId || !query.data) {
      return { ...empty, isLoading: query.isLoading, isError: query.isError };
    }
    const data: any = query.data;
    const propMap: Map<string, any> = data.propMap ?? new Map();
    const profileMap: Map<string, any> = data.profiles ?? new Map();

    const properties: LandlordPropertySummary[] = (data.properties as any[]).map((p) => ({
      property_id: p.id,
      property_name: p.name,
      property_address: p.address,
      property_image: p.image_url ?? null,
      units: Number(p.units ?? 0),
      monthly_rent: Number(p.monthly_rent ?? 0),
      is_archived: !!p.is_archived,
      is_paused: !!p.is_paused,
      is_public: !!p.is_public,
      currency: p.currency ?? "NGN",
      region: p.region ?? "NG",
      property_type: p.property_type ?? "residential",
      listing_type: p.listing_type ?? "standard",
      description: (p.description as string | null) ?? null,
      amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
      acquisition_cost: p.acquisition_cost != null ? Number(p.acquisition_cost) : null,
      current_value: p.current_value != null ? Number(p.current_value) : null,
      annual_expenses: p.annual_expenses != null ? Number(p.annual_expenses) : null,
      landlord_id: p.landlord_id ?? null,
      created_at: p.created_at ?? "",
      updated_at: p.updated_at ?? "",
    }));

    // Derived tenants: lease-first, then bookings without a fully-signed lease
    const derivedTenants: LandlordTenantDerived[] = [];
    const seenKeys = new Set<string>();

    for (const l of data.leases as any[]) {
      const prop = propMap.get(l.property_id);
      if (!prop) continue;
      const profile = l.tenant_user_id ? profileMap.get(l.tenant_user_id) : null;
      const fullySigned = !!(l.tenant_signed_at && l.landlord_signed_at);
      seenKeys.add(`${l.tenant_user_id}::${l.property_id}`);
      derivedTenants.push({
        id: l.id,
        source: "lease",
        property_id: l.property_id,
        property_name: prop.name,
        unit_number: l.unit_number ?? "—",
        tenant_user_id: l.tenant_user_id,
        tenant_name: profile?.full_name ?? l.tenant_name ?? "Tenant",
        tenant_email: profile?.email ?? null,
        tenant_phone: profile?.phone ?? null,
        rent_amount: Number(l.rent_amount ?? 0),
        currency: l.currency ?? "NGN",
        lease_start: l.lease_start,
        lease_end: l.lease_end,
        payment_status: fullySigned ? "paid" : "pending",
        fully_signed: fullySigned,
        tenant_signed_at: l.tenant_signed_at,
        landlord_signed_at: l.landlord_signed_at,
        booking_status: null,
      });
    }

    for (const b of data.bookings as any[]) {
      const key = `${b.user_id}::${b.property_id}`;
      if (seenKeys.has(key)) continue;
      const prop = propMap.get(b.property_id);
      if (!prop) continue;
      const profile = profileMap.get(b.user_id);
      seenKeys.add(key);
      derivedTenants.push({
        id: b.id,
        source: "booking",
        property_id: b.property_id,
        property_name: prop.name,
        unit_number: "—",
        tenant_user_id: b.user_id,
        tenant_name: profile?.full_name ?? "Guest",
        tenant_email: profile?.email ?? null,
        tenant_phone: profile?.phone ?? null,
        rent_amount: Number(b.total_price ?? 0),
        currency: "NGN",
        lease_start: b.check_in,
        lease_end: b.check_out,
        payment_status: b.payment_status === "paid" ? "paid" : "pending",
        fully_signed: false,
        tenant_signed_at: null,
        landlord_signed_at: null,
        booking_status: b.status,
      });
    }

    const maintenance: LandlordMaintenanceItem[] = (data.maintenance as any[]).map((m) => ({
      id: m.id,
      property_id: m.property_id,
      property_name: propMap.get(m.property_id)?.name ?? "Property",
      title: m.title,
      description: m.description,
      priority: m.priority,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at,
      resolved_at: m.resolved_at,
      assigned_to: m.assigned_to,
      tenant_id: m.tenant_id,
      photo_urls: m.photo_urls,
      rating: m.rating,
    }));

    const payments: LandlordPaymentItem[] = (data.payments as any[]).map((p) => ({
      id: p.id,
      property_id: p.property_id,
      property_name: p.property_id ? propMap.get(p.property_id)?.name ?? "Property" : "—",
      tenant_id: p.tenant_id,
      amount: Number(p.amount ?? 0),
      status: p.status,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      notes: p.notes,
    }));

    return {
      isLoading: query.isLoading,
      isError: query.isError,
      properties,
      bookings: data.bookings ?? [],
      leases: data.leases ?? [],
      tenants: derivedTenants,
      maintenance,
      payments,
    };
  }, [userId, query.data, query.isLoading, query.isError]);
}

/** Property-scoped slice of the landlord lifecycle. */
export function usePropertyLifecycle(propertyId: string | null | undefined) {
  const lc = useLandlordLifecycle();
  return useMemo(() => {
    if (!propertyId) return null;
    const property = lc.properties.find((p) => p.property_id === propertyId) ?? null;
    return {
      isLoading: lc.isLoading,
      isError: lc.isError,
      property,
      bookings: lc.bookings.filter((b) => b.property_id === propertyId),
      leases: lc.leases.filter((l) => l.property_id === propertyId),
      tenants: lc.tenants.filter((t) => t.property_id === propertyId),
      maintenance: lc.maintenance.filter((m) => m.property_id === propertyId),
      payments: lc.payments.filter((p) => p.property_id === propertyId),
    };
  }, [propertyId, lc]);
}
