import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Home,
  UserCog,
  Shield,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
      {active && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
      )}
    </button>
  );
}

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { signOut, isAdmin, isConsultant, isLandlord, isTenant, profile, roles } = useAuth();

  // Base nav items
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", show: isAdmin || isConsultant || isLandlord },
    { icon: Home, label: "My Portal", id: "tenant-portal", show: isTenant },
    { icon: Building2, label: "Properties", id: "properties", show: isAdmin || isConsultant || isLandlord },
    { icon: Users, label: "Tenants", id: "tenants", show: isAdmin || isConsultant || isLandlord },
    { icon: Receipt, label: "Payments", id: "payments", show: isAdmin || isConsultant || isLandlord },
    { icon: BarChart3, label: "Reports", id: "reports", show: isAdmin || isConsultant || isLandlord },
    { icon: FileText, label: "Documents", id: "documents", show: true },
  ];

  // Admin-only items
  const adminItems = [
    { icon: UserCog, label: "Manage Users", id: "manage-users" },
    { icon: Shield, label: "Roles & Permissions", id: "roles" },
  ];

  const filteredNavItems = navItems.filter((item) => item.show);

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", className: "bg-destructive/20 text-destructive" };
    if (isConsultant) return { label: "Consultant", className: "bg-accent/20 text-accent" };
    if (isLandlord) return { label: "Landlord", className: "bg-success/20 text-success" };
    if (isTenant) return { label: "Tenant", className: "bg-primary/20 text-primary-foreground" };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-warm">
          <Home className="h-5 w-5 text-accent-foreground" />
        </div>
        <span className="font-display text-lg font-semibold text-sidebar-foreground">
          PropManage
        </span>
      </div>

      {/* User Info */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-slate text-sm font-medium text-primary-foreground">
            {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "User"}
            </p>
            {roleBadge && (
              <span className={cn("inline-block mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium", roleBadge.className)}>
                {roleBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin
            </p>
            {adminItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => onViewChange(item.id)}
              />
            ))}
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-4">
        <NavItem icon={Settings} label="Settings" onClick={() => onViewChange("settings")} />
        <NavItem icon={LogOut} label="Sign Out" onClick={signOut} />
      </div>
    </aside>
  );
}
