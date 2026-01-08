import { Building2, Users, DollarSign, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PropertyCard } from "@/components/PropertyCard";
import { TenantCard } from "@/components/TenantCard";

// Mock data
const properties = [
  {
    id: "1",
    name: "Sunset Apartments",
    address: "123 Main St, Downtown",
    units: 12,
    occupiedUnits: 11,
    monthlyRent: 14500,
  },
  {
    id: "2",
    name: "Oak View Complex",
    address: "456 Oak Ave, Westside",
    units: 8,
    occupiedUnits: 6,
    monthlyRent: 9600,
  },
  {
    id: "3",
    name: "Pine Street House",
    address: "789 Pine St, Eastside",
    units: 4,
    occupiedUnits: 4,
    monthlyRent: 5200,
  },
];

const tenants = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    property: "Sunset Apartments",
    unit: "4B",
    leaseEnd: "Mar 15, 2026",
    paymentStatus: "paid" as const,
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    property: "Oak View Complex",
    unit: "2A",
    leaseEnd: "Jun 30, 2025",
    paymentStatus: "pending" as const,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    property: "Pine Street House",
    unit: "1",
    leaseEnd: "Dec 1, 2025",
    paymentStatus: "overdue" as const,
  },
];

export function Dashboard() {
  return (
    <div className="space-y-8 p-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Properties"
          value="3"
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
          variant="default"
        />
        <StatCard
          title="Total Tenants"
          value="21"
          icon={Users}
          trend={{ value: 8, isPositive: true }}
          variant="accent"
        />
        <StatCard
          title="Monthly Revenue"
          value="$29,300"
          icon={DollarSign}
          trend={{ value: 5, isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Overdue Payments"
          value="2"
          icon={AlertTriangle}
          trend={{ value: -15, isPositive: true }}
          variant="default"
        />
      </div>

      {/* Properties Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Your Properties
          </h2>
          <button className="text-sm font-medium text-accent hover:underline">
            View all
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, index) => (
            <PropertyCard 
              key={property.id} 
              {...property}
              className={`animation-delay-${index * 100}`}
            />
          ))}
        </div>
      </section>

      {/* Recent Tenants Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Recent Tenants
          </h2>
          <button className="text-sm font-medium text-accent hover:underline">
            View all
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {tenants.map((tenant, index) => (
            <TenantCard 
              key={tenant.id} 
              {...tenant}
              className={`animation-delay-${index * 100}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
