import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Building2, FileText, CreditCard, Wrench, Loader2, Mail, Phone, Calendar, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { AppRole } from "@/hooks/useAdmin";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  consultant: "bg-accent/10 text-accent border-accent/20",
  landlord: "bg-success/10 text-success border-success/20",
  tenant: "bg-primary/10 text-primary border-primary/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
  vendor: "bg-muted text-muted-foreground border-muted",
};

interface AdminUserDetailProps {
  userId: string;
  onBack: () => void;
}

function useUserDetail(userId: string) {
  return useQuery({
    queryKey: ["admin", "user-detail", userId],
    queryFn: async () => {
      const [profileRes, rolesRes, propertiesRes, leasesRes, paymentsRes, maintenanceRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
        supabase.from("properties").select("id, name, address, monthly_rent, currency, listing_type, is_archived, is_paused, units").eq("landlord_id", userId),
        supabase.from("lease_agreements").select("id, property_id, tenant_name, landlord_name, rent_amount, currency, lease_start, lease_end, status, tenant_signed, landlord_signed").or(`tenant_user_id.eq.${userId},landlord_user_id.eq.${userId}`),
        supabase.from("payments").select("id, amount, status, payment_date, payment_method").eq("tenant_id", userId).order("payment_date", { ascending: false }).limit(20),
        supabase.from("maintenance_requests").select("id, title, status, priority, created_at, property_id").or(`tenant_id.eq.${userId},assigned_to.eq.${userId}`).order("created_at", { ascending: false }).limit(20),
      ]);

      return {
        profile: profileRes.data,
        roles: (rolesRes.data || []).map((r) => r.role as AppRole),
        properties: propertiesRes.data || [],
        leases: leasesRes.data || [],
        payments: paymentsRes.data || [],
        maintenance: maintenanceRes.data || [],
      };
    },
  });
}

export function AdminUserDetail({ userId, onBack }: AdminUserDetailProps) {
  const { data, isLoading } = useUserDetail(userId);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const { profile, roles, properties, leases, payments, maintenance } = data;
  const initials = profile.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || profile.email[0].toUpperCase();

  const isLandlord = roles.includes("landlord");
  const isTenant = roles.includes("tenant");

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-muted text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {profile.full_name || "Unknown"}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="outline" className={cn("capitalize", roleColors[role])}>
                      {role}
                    </Badge>
                  ))}
                  {roles.length === 0 && (
                    <Badge variant="secondary">No roles</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Joined {format(new Date(profile.created_at), "MMM d, yyyy")}
                </span>
                {profile.ux_role && (
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> UX: {profile.ux_role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{properties.length}</p>
            <p className="text-xs text-muted-foreground">Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{leases.length}</p>
            <p className="text-xs text-muted-foreground">Leases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{payments.length}</p>
            <p className="text-xs text-muted-foreground">Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{maintenance.length}</p>
            <p className="text-xs text-muted-foreground">Maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue={isLandlord ? "properties" : "leases"}>
        <TabsList>
          {properties.length > 0 && <TabsTrigger value="properties">Properties</TabsTrigger>}
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {properties.length > 0 && (
          <TabsContent value="properties">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.address}</TableCell>
                        <TableCell>{formatCurrency(p.monthly_rent, p.currency, true)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{p.listing_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.is_archived ? (
                            <Badge variant="destructive">Archived</Badge>
                          ) : p.is_paused ? (
                            <Badge variant="secondary">Paused</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20" variant="outline">Active</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="leases">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No leases</TableCell>
                    </TableRow>
                  ) : leases.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.tenant_name}</TableCell>
                      <TableCell>{l.landlord_name}</TableCell>
                      <TableCell>{formatCurrency(l.rent_amount, l.currency, true)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(l.lease_start), "MMM yyyy")} – {format(new Date(l.lease_end), "MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{l.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No payments</TableCell>
                    </TableRow>
                  ) : payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount, "NGN", true)}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{p.payment_method || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No requests</TableCell>
                    </TableRow>
                  ) : maintenance.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{m.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(m.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
