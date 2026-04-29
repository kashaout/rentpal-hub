/**
 * Sidebar correctness guard.
 *
 * Encodes the architectural rule that landlord and tenant sidebars must NOT
 * contain standalone "Properties", "Documents" or "Lease" entries — those
 * surfaces are exposed only as tabs inside Dashboard → PropertyCommandCenter
 * (landlord) or Dashboard → TenantCommandCenter (tenant).
 *
 * `assertSidebarShape` runs in dev only and throws (visible in console) if
 * a forbidden id leaks into a role's nav. It is invoked from Sidebar.tsx
 * via the `useSidebarGuard` hook below.
 */

export interface SidebarGuardItem {
  id: string;
  show: boolean;
}

const FORBIDDEN_IDS_BY_ROLE: Record<"landlord" | "tenant", string[]> = {
  // Landlord must reach properties/leases via Dashboard → PropertyCommandCenter
  landlord: ["properties", "documents", "lease", "tenant-lease", "lease-agreements"],
  // Tenant must reach lease/documents via Dashboard → TenantCommandCenter
  tenant: ["properties", "documents", "lease", "tenant-lease", "lease-agreements"],
};

export function assertSidebarShape(
  role: "landlord" | "tenant",
  items: SidebarGuardItem[]
): { ok: true } | { ok: false; offenders: string[] } {
  const visibleIds = items.filter((i) => i.show).map((i) => i.id);
  const forbidden = FORBIDDEN_IDS_BY_ROLE[role];
  const offenders = visibleIds.filter((id) => forbidden.includes(id));
  if (offenders.length === 0) return { ok: true };
  if (import.meta.env.DEV) {
    // Loud but non-fatal so the dev sees it immediately
    // eslint-disable-next-line no-console
    console.error(
      `[sidebar-guard] ${role} sidebar contains forbidden entries: ${offenders.join(", ")}. ` +
        `These views must live inside Dashboard, not as top-level nav items.`
    );
  }
  return { ok: false, offenders };
}
