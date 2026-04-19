import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileText, Wrench, Banknote, Calendar, Loader2, Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantBookedProperties } from "@/hooks/useTenantBookedProperties";
import { useMyLeaseAgreements } from "@/hooks/useLeaseAgreements";
import {
  TenantPropertySelector,
  pickDefaultProperty,
  PropertyHeaderInfo,
} from "./TenantPropertySelector";
import { formatCurrency } from "@/lib/formatCurrency";
import { EmptyState } from "@/components/ui/empty-state";
import { decodeBookingNotes } from "@/lib/bookingTime";

/**
 * Tenant Reports — comprehensive history view with a property selector
 * (Current / Past). Pulls payments, maintenance issues, lease history, and
 * stay history scoped to the selected property.
 */
export function TenantReportsPage() {
  const { user } = useAuth();
  const { data: properties, isLoading: propsLoading } = useTenantBookedProperties();
  const { data: leases } = useMyLeaseAgreements();
  const [filter, setFilter] = useState<"current" | "past">("current");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const effectivePropertyId =
    selectedPropertyId ?? pickDefaultProperty(properties, filter);

  const selectedProperty = (properties ?? []).find(
    (p) => p.property_id === effectivePropertyId
  );

  // Bookings (stay history) for the selected property
  const { data: bookings } = useQuery({
    queryKey: ["tenant-reports-bookings", user?.id, effectivePropertyId],
    enabled: !!user?.id && !!effectivePropertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, total_price, status, payment_status, notes")
        .eq("user_id", user!.id)
        .eq("property_id", effectivePropertyId!)
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Payments for tenant rows of the selected property
  const { data: payments } = useQuery({
    queryKey: ["tenant-reports-payments", user?.id, effectivePropertyId],
    enabled: !!user?.id && !!effectivePropertyId,
    queryFn: async () => {
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user!.id)
        .eq("property_id", effectivePropertyId!);
      const ids = (tenantRows ?? []).map((t: any) => t.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, payment_date, status, payment_method, notes")
        .in("tenant_id", ids)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Maintenance issues for the selected property
  const { data: issues } = useQuery({
    queryKey: ["tenant-reports-issues", user?.id, effectivePropertyId],
    enabled: !!user?.id && !!effectivePropertyId,
    queryFn: async () => {
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user!.id)
        .eq("property_id", effectivePropertyId!);
      const ids = (tenantRows ?? []).map((t: any) => t.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, title, priority, status, created_at, resolved_at")
        .in("tenant_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const propertyLeases = useMemo(
    () => (leases ?? []).filter((l) => l.property_id === effectivePropertyId),
    [leases, effectivePropertyId]
  );

  if (propsLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!properties?.length) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="No history yet"
          description="Once you've booked or leased a property, your full report history will appear here."
        />
      </div>
    );
  }

  const totalPaid = (payments ?? [])
    .filter((p: any) => p.status === "completed" || p.status === "paid")
    .reduce((sum, p: any) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <TenantPropertySelector
        selectedPropertyId={effectivePropertyId}
        onChange={setSelectedPropertyId}
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f as any);
          setSelectedPropertyId(null);
        }}
      />

      <PropertyHeaderInfo property={selectedProperty} />

      {!selectedProperty ? (
        <EmptyState
          icon={Building2}
          title={`No ${filter} properties`}
          description={`You have no ${filter} stays to report on.`}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stay history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" /> Stay History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b: any) => {
                      const decoded = decodeBookingNotes(b.notes);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="text-sm">
                            <div>{format(new Date(b.check_in), "MMM d, yyyy")}{decoded.checkInTime ? ` ${decoded.checkInTime}` : ""}</div>
                            <div className="text-xs text-muted-foreground">→ {format(new Date(b.check_out), "MMM d, yyyy")}{decoded.checkOutTime ? ` ${decoded.checkOutTime}` : ""}</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(Number(b.total_price), "NGN")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No bookings recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4" /> Payments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-success">{formatCurrency(totalPaid, "NGN")}</span>
              </p>
            </CardHeader>
            <CardContent>
              {payments?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(Number(p.amount), "NGN")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {p.payment_method?.replace("_", " ") ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No payments recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Maintenance history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" /> Maintenance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issues?.length ? (
                <div className="space-y-2">
                  {issues.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between border-b last:border-0 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{i.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(i.created_at), "MMM d, yyyy")}
                          {i.resolved_at && ` · resolved ${format(new Date(i.resolved_at), "MMM d")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="capitalize text-xs">{i.priority}</Badge>
                        <Badge variant="outline" className="capitalize text-xs">{i.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No maintenance history.</p>
              )}
            </CardContent>
          </Card>

          {/* Lease history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Lease History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propertyLeases.length ? (
                <div className="space-y-3">
                  {propertyLeases.map((l) => (
                    <div key={l.id} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Unit {l.unit_number}</p>
                        <Badge variant="outline" className="capitalize text-xs">
                          {l.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(l.lease_start), "MMM d, yyyy")} → {format(new Date(l.lease_end), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs">
                        {formatCurrency(l.rent_amount, l.currency)} / month
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        {l.tenant_signed && (
                          <Badge variant="outline" className="bg-success/10 text-success text-xs">Tenant signed</Badge>
                        )}
                        {l.landlord_signed && (
                          <Badge variant="outline" className="bg-success/10 text-success text-xs">Landlord signed</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No leases recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
