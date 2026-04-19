import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LandlordTenantRow {
  /** lease_agreements.id — primary key for this row */
  id: string;
  source: "lease" | "tenants";
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_user_id: string | null;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent_amount: number;
  currency: string;
  lease_start: string;
  lease_end: string;
  payment_status: "paid" | "pending" | "overdue";
  /** True only when both parties have signed */
  fully_signed: boolean;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
}

/**
 * Returns the canonical "tenants under management" list for the current landlord.
 *
 * This is driven by `lease_agreements` where BOTH parties have signed
 * (per the user's request: "Tenant appears in landlord Tenants view immediately
 * after landlord signs"). We additionally surface any rows present in the
 * legacy `tenants` table that don't yet have a fully-signed lease, so nothing
 * existing disappears.
 */
export function useLandlordTenants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["landlord-tenants", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<LandlordTenantRow[]> => {
      if (!user?.id) return [];

      // 1) Fully-signed lease agreements where I'm the landlord
      const { data: leases, error: leaseErr } = await supabase
        .from("lease_agreements" as any)
        .select(
          "id, property_id, tenant_user_id, tenant_name, unit_number, rent_amount, currency, lease_start, lease_end, tenant_signed_at, landlord_signed_at"
        )
        .eq("landlord_user_id", user.id)
        .not("tenant_signed_at", "is", null)
        .not("landlord_signed_at", "is", null)
        .order("lease_start", { ascending: false });

      if (leaseErr) throw leaseErr;

      const propertyIds = new Set<string>();
      const tenantUserIds = new Set<string>();
      (leases ?? []).forEach((l: any) => {
        if (l.property_id) propertyIds.add(l.property_id);
        if (l.tenant_user_id) tenantUserIds.add(l.tenant_user_id);
      });

      // 2) Pull the matching tenants rows for payment_status (and to keep the
      //    classic "tenants" table coverage where landlords manually added rows)
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id, user_id, property_id, payment_status, lease_start, lease_end, rent_amount, unit_number")
        .eq("is_archived", false);

      // 3) Properties for naming
      const allPropIds = new Set<string>(propertyIds);
      (tenantRows ?? []).forEach((t: any) => t.property_id && allPropIds.add(t.property_id));

      const { data: props } = allPropIds.size
        ? await supabase
            .from("properties")
            .select("id, name, landlord_id")
            .in("id", Array.from(allPropIds))
        : { data: [] as any[] };

      const propMap = new Map<string, any>();
      (props ?? []).forEach((p: any) => propMap.set(p.id, p));

      // 4) Tenant profiles
      (tenantRows ?? []).forEach((t: any) => t.user_id && tenantUserIds.add(t.user_id));
      const { data: profiles } = tenantUserIds.size
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone")
            .in("user_id", Array.from(tenantUserIds))
        : { data: [] as any[] };
      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

      const rows: LandlordTenantRow[] = [];
      const seenLeaseKeys = new Set<string>();

      // Convert lease agreements
      for (const l of (leases ?? []) as any[]) {
        const prop = propMap.get(l.property_id);
        if (!prop || prop.landlord_id !== user.id) continue;
        const profile = l.tenant_user_id ? profileMap.get(l.tenant_user_id) : null;
        const matchingTenant = (tenantRows ?? []).find(
          (t: any) => t.user_id === l.tenant_user_id && t.property_id === l.property_id
        );
        seenLeaseKeys.add(`${l.tenant_user_id}::${l.property_id}`);
        rows.push({
          id: l.id,
          source: "lease",
          property_id: l.property_id,
          property_name: prop.name,
          unit_number: l.unit_number ?? matchingTenant?.unit_number ?? "—",
          tenant_user_id: l.tenant_user_id,
          tenant_name: profile?.full_name ?? l.tenant_name ?? "Tenant",
          tenant_email: profile?.email ?? null,
          tenant_phone: profile?.phone ?? null,
          rent_amount: Number(l.rent_amount ?? matchingTenant?.rent_amount ?? 0),
          currency: l.currency ?? "NGN",
          lease_start: l.lease_start,
          lease_end: l.lease_end,
          payment_status: (matchingTenant?.payment_status as any) ?? "pending",
          fully_signed: true,
          tenant_signed_at: l.tenant_signed_at,
          landlord_signed_at: l.landlord_signed_at,
        });
      }

      // Surface any legacy tenants rows that don't yet have a fully-signed lease
      for (const t of (tenantRows ?? []) as any[]) {
        const prop = propMap.get(t.property_id);
        if (!prop || prop.landlord_id !== user.id) continue;
        if (t.user_id && seenLeaseKeys.has(`${t.user_id}::${t.property_id}`)) continue;
        const profile = t.user_id ? profileMap.get(t.user_id) : null;
        rows.push({
          id: t.id,
          source: "tenants",
          property_id: t.property_id,
          property_name: prop.name,
          unit_number: t.unit_number ?? "—",
          tenant_user_id: t.user_id,
          tenant_name: profile?.full_name ?? "Tenant",
          tenant_email: profile?.email ?? null,
          tenant_phone: profile?.phone ?? null,
          rent_amount: Number(t.rent_amount ?? 0),
          currency: "NGN",
          lease_start: t.lease_start,
          lease_end: t.lease_end,
          payment_status: (t.payment_status as any) ?? "pending",
          fully_signed: false,
          tenant_signed_at: null,
          landlord_signed_at: null,
        });
      }

      return rows;
    },
  });
}
