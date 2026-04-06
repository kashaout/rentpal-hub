import { useMemo, useState } from "react";
import { usePayments, PaymentWithTenant } from "@/hooks/usePayments";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Building2, Users, Banknote, Loader2, Wrench, Star, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { formatCurrency } from "@/lib/formatCurrency";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"];

export function ReportsPage() {
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders();
  const { data: maintenanceRequests = [], isLoading: mrLoading } = useMaintenanceRequests();

  const isLoading = paymentsLoading || propertiesLoading || tenantsLoading || woLoading || mrLoading;

  // Revenue trends - last 6 months
  const revenueData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthRevenue = payments
        .filter((p) => {
          const paymentDate = parseISO(p.payment_date);
          return isWithinInterval(paymentDate, { start, end }) && p.status === "completed";
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);
      months.push({ month: format(date, "MMM"), revenue: monthRevenue });
    }
    return months;
  }, [payments]);

  const occupancyData = useMemo(() => {
    const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
    const occupiedUnits = tenants.length;
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    return {
      rate: occupancyRate,
      chart: [
        { name: "Occupied", value: occupiedUnits },
        { name: "Vacant", value: vacantUnits },
      ],
    };
  }, [properties, tenants]);

  const paymentStatusData = useMemo(() => {
    const statusCounts = { completed: 0, pending: 0, overdue: 0 };
    payments.forEach((p) => {
      if (p.status === "completed") statusCounts.completed++;
      else if (p.status === "pending") statusCounts.pending++;
      else statusCounts.overdue++;
    });
    return [
      { name: "Completed", value: statusCounts.completed, fill: "hsl(var(--success))" },
      { name: "Pending", value: statusCounts.pending, fill: "hsl(var(--warning))" },
      { name: "Overdue", value: statusCounts.overdue, fill: "hsl(var(--destructive))" },
    ];
  }, [payments]);

  const stats = useMemo(() => {
    const totalRevenue = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0);
    const currentMonthRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
    const lastMonthRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
    const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;
    return {
      totalRevenue, currentMonthRevenue, revenueGrowth,
      totalProperties: properties.length, totalTenants: tenants.length, occupancyRate: occupancyData.rate,
    };
  }, [payments, properties, tenants, revenueData, occupancyData]);

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Track your property performance, financial, and maintenance metrics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.currentMonthRevenue)}</div>
            <p className={`text-xs ${stats.revenueGrowth >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.totalTenants} of {properties.reduce((sum, p) => sum + p.units, 0)} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Properties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">{stats.totalTenants} tenants</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="financial" className="gap-2 flex-1 min-w-[120px]">
            <BarChart3 className="h-4 w-4" /> Financial
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 flex-1 min-w-[120px]">
            <Wrench className="h-4 w-4" /> Maintenance Performance
          </TabsTrigger>
          <TabsTrigger value="tenant-history" className="gap-2 flex-1 min-w-[120px]">
            <Star className="h-4 w-4" /> Tenant Issues & Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <FinancialReportsTab
            revenueData={revenueData}
            occupancyData={occupancyData}
            paymentStatusData={paymentStatusData}
            payments={payments}
            tenants={tenants}
            properties={properties}
          />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenancePerformanceTab workOrders={workOrders} requests={maintenanceRequests} properties={properties} />
        </TabsContent>
        <TabsContent value="tenant-history">
          <TenantIssueReviewTab requests={maintenanceRequests} properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinancialReportsTab({ revenueData, occupancyData, paymentStatusData, payments, tenants, properties }: any) {
  const revenueByProperty = useMemo(() => {
    const propertyRevenue: Record<string, { name: string; revenue: number }> = {};
    payments.filter((p: any) => p.status === "completed").forEach((p: any) => {
      const tenant = tenants.find((t: any) => t.id === p.tenant_id);
      if (tenant) {
        const property = properties.find((prop: any) => prop.id === tenant.property_id);
        if (property) {
          if (!propertyRevenue[property.id]) propertyRevenue[property.id] = { name: property.name, revenue: 0 };
          propertyRevenue[property.id].revenue += Number(p.amount);
        }
      }
    });
    return Object.values(propertyRevenue).slice(0, 5);
  }, [payments, tenants, properties]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 mt-4">
      <Card>
        <CardHeader><CardTitle>Revenue Trend</CardTitle><CardDescription>Monthly revenue over the last 6 months</CardDescription></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₦${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`₦${v.toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Revenue by Property</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {revenueByProperty.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByProperty} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `₦${v}`} />
                  <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`₦${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No payment data</div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Occupancy Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {occupancyData.chart.some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={occupancyData.chart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {occupancyData.chart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Payment Status</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {paymentStatusData.some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                    {paymentStatusData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenancePerformanceTab({ workOrders, requests, properties }: { workOrders: any[]; requests: any[]; properties: any[] }) {
  const [propertyFilter, setPropertyFilter] = useState("all");

  const filtered = useMemo(() => {
    if (propertyFilter === "all") return { workOrders, requests };
    return {
      workOrders: workOrders.filter((wo: any) => wo.property_id === propertyFilter),
      requests: requests.filter((r: any) => r.property_id === propertyFilter),
    };
  }, [workOrders, requests, propertyFilter]);

  const stats = useMemo(() => {
    const wo = filtered.workOrders;
    const totalWO = wo.length;
    const completed = wo.filter((w: any) => ["completed", "verified", "closed"].includes(w.status)).length;
    const slaResponseMet = wo.filter((w: any) => w.sla_response_met === true).length;
    const slaResolutionMet = wo.filter((w: any) => w.sla_resolution_met === true).length;
    const slaResponseTotal = wo.filter((w: any) => w.sla_response_met !== null).length;
    const slaResolutionTotal = wo.filter((w: any) => w.sla_resolution_met !== null).length;
    const totalCost = wo.reduce((sum: number, w: any) => sum + (Number(w.actual_cost) || 0), 0);
    const avgRating = filtered.requests.filter((r: any) => r.rating).length > 0
      ? filtered.requests.filter((r: any) => r.rating).reduce((sum: number, r: any) => sum + r.rating, 0) / filtered.requests.filter((r: any) => r.rating).length
      : 0;

    return {
      totalWO, completed,
      completionRate: totalWO > 0 ? Math.round((completed / totalWO) * 100) : 0,
      slaResponseRate: slaResponseTotal > 0 ? Math.round((slaResponseMet / slaResponseTotal) * 100) : 0,
      slaResolutionRate: slaResolutionTotal > 0 ? Math.round((slaResolutionMet / slaResolutionTotal) * 100) : 0,
      totalCost,
      avgRating: Math.round(avgRating * 10) / 10,
      openRequests: filtered.requests.filter((r: any) => r.status === "pending" || r.status === "in_progress").length,
    };
  }, [filtered]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Work Orders</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalWO}</p><p className="text-xs text-muted-foreground">{stats.completed} completed ({stats.completionRate}%)</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SLA Response Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.slaResponseRate}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SLA Resolution Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.slaResolutionRate}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Rating</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1"><p className="text-2xl font-bold">{stats.avgRating || "–"}</p>{stats.avgRating > 0 && <Star className="h-5 w-5 text-warning fill-warning" />}</div><p className="text-xs text-muted-foreground">Total cost: {formatCurrency(stats.totalCost)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Work Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.workOrders.slice(0, 15).map((wo: any) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium text-sm">{wo.request_title || "Work Order"}</TableCell>
                  <TableCell className="text-sm">{wo.property_name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{wo.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{wo.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{wo.actual_cost ? formatCurrency(Number(wo.actual_cost)) : "–"}</TableCell>
                  <TableCell>
                    {wo.sla_response_met === false || wo.sla_resolution_met === false
                      ? <Badge variant="destructive" className="text-xs">Breached</Badge>
                      : wo.sla_response_met === true
                      ? <Badge variant="outline" className="text-xs bg-success/10 text-success">Met</Badge>
                      : <span className="text-xs text-muted-foreground">–</span>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.workOrders.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No work orders</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantIssueReviewTab({ requests, properties }: { requests: any[]; properties: any[] }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["all-reviews-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const propMap = useMemo(() => new Map(properties.map((p: any) => [p.id, p.name])), [properties]);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Issues</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{requests.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open Issues</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-warning">{requests.filter((r: any) => r.status === "pending" || r.status === "in_progress").length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reviews</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{reviews.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tenant Issues</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.slice(0, 20).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.title}</TableCell>
                  <TableCell className="text-sm">{r.property_name || propMap.get(r.property_id) || "–"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{r.priority}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.status}</Badge></TableCell>
                  <TableCell>{r.rating ? <span className="flex items-center gap-1 text-sm"><Star className="h-3 w-3 text-warning fill-warning" />{r.rating}/5</span> : "–"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reviews.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Reviews</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.slice(0, 15).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="capitalize text-sm">{r.review_type}</TableCell>
                    <TableCell className="text-sm">{propMap.get(r.property_id) || "–"}</TableCell>
                    <TableCell><span className="flex items-center gap-1 text-sm"><Star className="h-3 w-3 text-warning fill-warning" />{r.overall_rating}/5</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.comment || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
