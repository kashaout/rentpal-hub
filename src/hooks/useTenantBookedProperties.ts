import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { decodeBookingNotes, isAfterCheckOut } from "@/lib/bookingTime";

export interface TenantBookedProperty {
  property_id: string;
  property_name: string;
  property_address: string;
  image_url: string | null;
  /** Most recent booking that gives the tenant access to this property */
  booking_id: string | null;
  check_in: string | null;
  check_out: string | null;
  check_in_time?: string;
  check_out_time?: string;
  /** Most recent active lease tied to this property (if any) */
  lease_id: string | null;
  lease_start: string | null;
  lease_end: string | null;
  status: "current" | "past";
}

/**
 * Returns every property the current tenant has stayed in or is currently
 * staying in. Combines lease_agreements + bookings so the dashboard property
 * selector can show both Current and Past stays.
 */
export function useTenantBookedProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant-booked-properties", user?.id],
    queryFn: async (): Promise<TenantBookedProperty[]> => {
      if (!user?.id) return [];

      // 1) Lease-based access
      const { data: leases } = await supabase
        .from("lease_agreements" as any)
        .select("id, property_id, lease_start, lease_end, tenant_signed_at, landlord_signed_at")
        .eq("tenant_user_id", user.id)
        .order("lease_start", { ascending: false });

      // 2) Booking-based access (paid / confirmed / completed)
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, property_id, check_in, check_out, status, payment_status, notes")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "completed", "active"])
        .order("check_in", { ascending: false });

      const propertyIds = new Set<string>();
      (leases ?? []).forEach((l: any) => l.property_id && propertyIds.add(l.property_id));
      (bookings ?? []).forEach((b: any) => b.property_id && propertyIds.add(b.property_id));
      if (propertyIds.size === 0) return [];

      const { data: props } = await supabase
        .from("properties")
        .select("id, name, address, image_url")
        .in("id", Array.from(propertyIds));

      const propMap = new Map<string, any>();
      (props ?? []).forEach((p: any) => propMap.set(p.id, p));

      const today = new Date();
      const map = new Map<string, TenantBookedProperty>();

      for (const lease of (leases ?? []) as any[]) {
        const p = propMap.get(lease.property_id);
        if (!p) continue;
        const isCurrent = new Date(lease.lease_end) >= today
          && lease.tenant_signed_at && lease.landlord_signed_at;
        const existing = map.get(lease.property_id);
        if (existing && existing.status === "current") continue;
        map.set(lease.property_id, {
          property_id: lease.property_id,
          property_name: p.name,
          property_address: p.address,
          image_url: p.image_url ?? null,
          booking_id: existing?.booking_id ?? null,
          check_in: existing?.check_in ?? null,
          check_out: existing?.check_out ?? null,
          check_in_time: existing?.check_in_time,
          check_out_time: existing?.check_out_time,
          lease_id: lease.id,
          lease_start: lease.lease_start,
          lease_end: lease.lease_end,
          status: isCurrent ? "current" : "past",
        });
      }

      for (const b of (bookings ?? []) as any[]) {
        const p = propMap.get(b.property_id);
        if (!p) continue;
        const decoded = decodeBookingNotes(b.notes);
        const past = isAfterCheckOut(b.check_out, decoded.checkOutTime);
        const existing = map.get(b.property_id);
        const status: "current" | "past" = past ? "past" : "current";
        if (existing) {
          // Enrich with booking timing if missing
          map.set(b.property_id, {
            ...existing,
            booking_id: existing.booking_id ?? b.id,
            check_in: existing.check_in ?? b.check_in,
            check_out: existing.check_out ?? b.check_out,
            check_in_time: existing.check_in_time ?? decoded.checkInTime,
            check_out_time: existing.check_out_time ?? decoded.checkOutTime,
            status: existing.status === "current" ? "current" : status,
          });
        } else {
          map.set(b.property_id, {
            property_id: b.property_id,
            property_name: p.name,
            property_address: p.address,
            image_url: p.image_url ?? null,
            booking_id: b.id,
            check_in: b.check_in,
            check_out: b.check_out,
            check_in_time: decoded.checkInTime,
            check_out_time: decoded.checkOutTime,
            lease_id: null,
            lease_start: null,
            lease_end: null,
            status,
          });
        }
      }

      // Sort: current first, then by most recent date desc
      return Array.from(map.values()).sort((a, b) => {
        if (a.status !== b.status) return a.status === "current" ? -1 : 1;
        const dateA = a.lease_start ?? a.check_in ?? "";
        const dateB = b.lease_start ?? b.check_in ?? "";
        return dateB.localeCompare(dateA);
      });
    },
    enabled: !!user?.id,
  });
}
