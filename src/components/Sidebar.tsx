import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Settings, LogOut,
  Home, UserCog, Shield, BarChart3, Wrench,
  TrendingUp, Wallet, Crown, Plus, MessageSquare, ChevronDown, Loader2,
  X, Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionContext } from "@/hooks/useSubscriptionContext";
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

function NavItem({ icon: Icon, label, active, onClick, badge, locked }: NavItemProps & { locked?: boolean }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
        locked
          ? "text-muted-foreground/40 cursor-not-allowed"
          : active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "text-primary", locked && "text-muted-foreground/40")} />
      <span className="flex-1 text-left">{label}</span>
      {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />}
      {!locked && badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">
          {badge > 99 ? "99+" : badge}
        </Badge>
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
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 bg-primary/10 text-primary hover:bg-primary/15">
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
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ currentView, onViewChange, open, onClose }: SidebarProps) {
  const { signOut, isAdmin, isConsultant, isLandlord, isTenant, isMaintenance, isVendor, profile } = useAuth();
  const { hasFeature, isReadOnly } = useSubscriptionContext();

  const isManagerRole = isAdmin || isConsultant || isLandlord;

  const navItems = [
    // Landlord / Admin / Consultant
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", show: isManagerRole, locked: false },
    { icon: Building2, label: "Properties", id: "properties", show: isManagerRole, locked: false },
    { icon: Users, label: "Tenants", id: "tenants", show: isManagerRole, locked: false },
    { icon: Wrench, label: "Maintenance", id: "maintenance-portal", show: isManagerRole || isMaintenance || isVendor, locked: isManagerRole && !isAdmin && !hasFeature("maintenance") },
    { icon: Wallet, label: "Financials", id: "finance", show: isManagerRole, locked: !isAdmin && !hasFeature("financials") },
    { icon: BarChart3, label: "Reports", id: "reports", show: isManagerRole, locked: !isAdmin && !hasFeature("reports") },
    { icon: Shield, label: "Consultants", id: "manage-users", show: isManagerRole && (isAdmin || hasFeature("consultants")), locked: false },

    // Tenant
    { icon: Home, label: "My Portal", id: "tenant-portal", show: isTenant, locked: false },
    { icon: LayoutDashboard, label: "My Tenancy", id: "tenant-command-center", show: isTenant, locked: false },
    { icon: Building2, label: "Browse Properties", id: "browse-properties", show: isTenant, locked: false },
    { icon: Users, label: "Inbox", id: "tenant-inbox", show: isTenant, locked: false },
  ];

  const adminItems = [
    { icon: UserCog, label: "Manage Users", id: "manage-users" },
    { icon: TrendingUp, label: "Worker Performance", id: "worker-performance" },
    { icon: Crown, label: "Subscription", id: "subscription" },
  ];

  // Landlord (non-admin) user management
  const showLandlordAdmin = isLandlord && !isAdmin;

  const filteredNavItems = navItems.filter((item) => item.show);

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", className: "bg-destructive/10 text-destructive" };
    if (isConsultant) return { label: "Consultant", className: "bg-primary/10 text-primary" };
    if (isLandlord) return { label: "Landlord", className: "bg-success/10 text-success" };
    if (isMaintenance) return { label: "Maintenance", className: "bg-warning/10 text-warning" };
    if (isVendor) return { label: "Vendor", className: "bg-secondary text-secondary-foreground" };
    if (isTenant) return { label: "Tenant", className: "bg-primary/10 text-primary" };
    return null;
  };

  const roleBadge = getRoleBadge();

  const handleNavigate = (id: string) => {
    onViewChange(id);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-80 flex-col bg-background border-r shadow-elevated transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">PropManage</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
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
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <QuickIssueButton onViewChange={handleNavigate} />

          {filteredNavItems.map((item) => (
            <NavItem
              key={item.id + item.label}
              icon={item.icon}
              label={item.label}
              active={currentView === item.id}
              onClick={() => {
                if (item.locked) {
                  handleNavigate("subscription");
                } else {
                  handleNavigate(item.id);
                }
              }}
              locked={item.locked}
            />
          ))}

          {showLandlordAdmin && (
            <>
              <div className="my-3 border-t" />
              <NavItem
                icon={UserCog}
                label="Manage Users"
                active={currentView === "manage-users"}
                onClick={() => handleNavigate("manage-users")}
              />
            </>
          )}

          {isAdmin && (
            <>
              <div className="my-3 border-t" />
              <p className="mb-1 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
              {adminItems.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={currentView === item.id}
                  onClick={() => handleNavigate(item.id)}
                />
              ))}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t p-3 space-y-0.5">
          <NavItem icon={Settings} label="Settings" active={currentView === "settings"} onClick={() => handleNavigate("settings")} />
          <NavItem icon={LogOut} label="Sign Out" onClick={signOut} />
        </div>
      </aside>
    </>
  );
}
