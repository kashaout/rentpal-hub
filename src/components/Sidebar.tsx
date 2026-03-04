import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Receipt, FileText, Settings, LogOut,
  Home, UserCog, Shield, ShieldCheck, BarChart3, Wrench, ClipboardList,
  TrendingUp, Wallet, Zap, Crown, Plus, MessageSquare, ChevronDown, Loader2,
  Clipboard, Scale, Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAlertCount } from "@/hooks/useAutomationWorkflows";
import { useTenantLease } from "@/hooks/useTenantPortal";
import { useCreateMaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useCreateTenantRequest } from "@/hooks/useTenantRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

function NavItem({ icon: Icon, label, active, onClick, badge }: NavItemProps) {
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
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-auto h-5 min-w-5 p-0 flex items-center justify-center text-xs">
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
      {active && !badge && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
      )}
    </button>
  );
}

function QuickIssueButton({ onViewChange }: { onViewChange: (view: string) => void }) {
  const { user, isTenant } = useAuth();
  const { data: lease } = useTenantLease();
  const createMaintenanceRequest = useCreateMaintenanceRequest();
  const createTenantRequest = useCreateTenantRequest();
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<"maintenance" | "request" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");

  if (!isTenant || !lease) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !user) return;

    if (issueType === "maintenance") {
      await createMaintenanceRequest.mutateAsync({
        tenant_id: lease.id,
        property_id: lease.property_id,
        title: title.trim(),
        description: description.trim(),
        priority: priority as any,
      });
    } else {
      await createTenantRequest.mutateAsync({
        tenant_user_id: user.id,
        property_id: lease.property_id,
        category,
        subject: title.trim(),
        message: description.trim(),
        priority,
      });
    }

    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("general");
    setIssueType(null);
    setOpen(false);
  };

  const isPending = createMaintenanceRequest.isPending || createTenantRequest.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20">
            <Plus className="h-5 w-5" />
            Raise Issue
            <ChevronDown className="h-4 w-4 ml-auto" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={() => { setIssueType("maintenance"); setOpen(true); }} className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance Issue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIssueType("request"); setOpen(true); }} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            General Request
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {issueType === "maintenance" ? <Wrench className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              {issueType === "maintenance" ? "Report Maintenance Issue" : "Submit Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {issueType === "request" && (
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="lease_question">Lease Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">{issueType === "maintenance" ? "Issue Title" : "Subject"}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={issueType === "maintenance" ? "e.g., Leaking faucet" : "Brief subject..."} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." className="mt-1 h-28" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || !description.trim() || isPending} className="flex-1 gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { signOut, isAdmin, isConsultant, isLandlord, isTenant, isMaintenance, isVendor, profile, roles } = useAuth();
  const unreadAlerts = useUnreadAlertCount();

  // Role-based navigation matrix
  // Admin & Landlord: see everything
  // Consultant: management views (no escrow/reviews)
  // Tenant: portal, browse, agreements, inbox
  // Maintenance/Vendor: maintenance portal, work orders, assigned issues
  const navItems = [
    // --- Landlord/Admin/Consultant: Overview & Portfolio ---
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", show: isAdmin || isConsultant || isLandlord },
    { icon: Building2, label: "Properties", id: "properties", show: isAdmin || isConsultant || isLandlord },
    { icon: Users, label: "Tenants", id: "tenants", show: isAdmin || isConsultant || isLandlord },
    { icon: FileText, label: "Agreements", id: "agreements", show: isLandlord || isAdmin },

    // --- Tenant: Portal & Browsing ---
    { icon: Home, label: "My Portal", id: "tenant-portal", show: isTenant },
    { icon: Building2, label: "Browse Properties", id: "browse-properties", show: isTenant },
    { icon: FileText, label: "My Agreements", id: "agreements", show: isTenant },
    { icon: Users, label: "Inbox", id: "tenant-inbox", show: isTenant },

    // --- Maintenance & Operations ---
    { icon: Wrench, label: "Maintenance", id: "maintenance-portal", show: isMaintenance || isVendor },
    { icon: ClipboardList, label: "Issue Reports", id: "issue-reports", show: isAdmin || isConsultant || isLandlord },
    { icon: Clipboard, label: "Work Orders", id: "work-orders", show: isAdmin || isConsultant || isLandlord || isMaintenance || isVendor },

    // --- Financial ---
    { icon: Receipt, label: "Payments", id: "payments", show: isAdmin || isConsultant || isLandlord || isTenant },
    { icon: Wallet, label: "Finance", id: "finance", show: isAdmin || isConsultant || isLandlord },
    { icon: Scale, label: "Escrow & Disputes", id: "escrow", show: isAdmin || isLandlord },

    // --- Compliance & Automation ---
    { icon: ShieldCheck, label: "Compliance", id: "compliance", show: isAdmin || isConsultant || isLandlord },
    { icon: Zap, label: "Automation", id: "automation", show: isAdmin || isConsultant || isLandlord, badge: unreadAlerts },

    // --- Reviews, Reports, Documents ---
    { icon: Star, label: "Reviews", id: "reviews-page", show: isAdmin || isLandlord || isTenant },
    { icon: BarChart3, label: "Reports", id: "reports", show: isAdmin || isConsultant || isLandlord },
    { icon: FileText, label: "Documents", id: "documents", show: isAdmin || isConsultant || isLandlord || isTenant },
  ];

  // Admin-only items
  const adminItems = [
    { icon: UserCog, label: "Manage Users", id: "manage-users" },
    { icon: Shield, label: "Roles & Permissions", id: "roles" },
    { icon: TrendingUp, label: "Worker Performance", id: "worker-performance" },
    { icon: Crown, label: "Subscription", id: "subscription" },
  ];

  const filteredNavItems = navItems.filter((item) => item.show);

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", className: "bg-destructive/20 text-destructive" };
    if (isConsultant) return { label: "Consultant", className: "bg-accent/20 text-accent" };
    if (isLandlord) return { label: "Landlord", className: "bg-success/20 text-success" };
    if (isMaintenance) return { label: "Maintenance", className: "bg-warning/20 text-warning" };
    if (isVendor) return { label: "Vendor", className: "bg-secondary text-secondary-foreground" };
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

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <QuickIssueButton onViewChange={onViewChange} />

        {filteredNavItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onViewChange(item.id)}
            badge={'badge' in item ? item.badge : undefined}
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
