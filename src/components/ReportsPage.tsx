import { useMemo } from "react";
import { usePayments, PaymentWithTenant } from "@/hooks/usePayments";
import { useProperties, PropertyWithStats } from "@/hooks/useProperties";
import { useTenants, TenantWithDetails } from "@/hooks/useTenants";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Building2, Users, Banknote, Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"];

export function ReportsPage() {
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();

  const isLoading = paymentsLoading || propertiesLoading || tenantsLoading;

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

      months.push({
        month: format(date, "MMM"),
        revenue: monthRevenue,
      });
    }
    return months;
  }, [payments]);

  // Occupancy rate
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

  // Payment status breakdown
  const paymentStatusData = useMemo(() => {
    const statusCounts = {
      completed: 0,
      pending: 0,
      overdue: 0,
    };

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

  // Revenue by property
  const revenueByProperty = useMemo(() => {
    const propertyRevenue: Record<string, { name: string; revenue: number }> = {};

    payments
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const tenant = tenants.find((t) => t.id === p.tenant_id);
        if (tenant) {
          const property = properties.find((prop) => prop.id === tenant.property_id);
          if (property) {
            if (!propertyRevenue[property.id]) {
              propertyRevenue[property.id] = { name: property.name, revenue: 0 };
            }
            propertyRevenue[property.id].revenue += Number(p.amount);
          }
        }
      });

    return Object.values(propertyRevenue).slice(0, 5);
  }, [payments, tenants, properties]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const currentMonthRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
    const lastMonthRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
    const revenueGrowth =
      lastMonthRevenue > 0
        ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

    return {
      totalRevenue,
      currentMonthRevenue,
      revenueGrowth,
      totalProperties: properties.length,
      totalTenants: tenants.length,
      occupancyRate: occupancyData.rate,
    };
  }, [payments, properties, tenants, revenueData, occupancyData]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Track your property performance and financial metrics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.currentMonthRevenue.toLocaleString()}</div>
            <p className={`text-xs ${stats.revenueGrowth >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.revenueGrowth >= 0 ? "+" : ""}
              {stats.revenueGrowth}% from last month
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

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
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
                  <YAxis className="text-xs" tickFormatter={(value) => `₦${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Property */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Property</CardTitle>
            <CardDescription>Top performing properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueByProperty.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByProperty} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tickFormatter={(value) => `₦${value}`} />
                    <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Occupancy Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Overview</CardTitle>
            <CardDescription>Current unit occupancy status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {occupancyData.chart.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyData.chart}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {occupancyData.chart.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No property data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Breakdown of all payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {paymentStatusData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
