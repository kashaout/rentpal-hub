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
} from "lucide-react";

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
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: Building2, label: "Properties", id: "properties" },
    { icon: Users, label: "Tenants", id: "tenants" },
    { icon: Receipt, label: "Payments", id: "payments" },
    { icon: FileText, label: "Documents", id: "documents" },
  ];

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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-4">
        <NavItem icon={Settings} label="Settings" />
        <NavItem icon={LogOut} label="Sign Out" />
      </div>
    </aside>
  );
}
