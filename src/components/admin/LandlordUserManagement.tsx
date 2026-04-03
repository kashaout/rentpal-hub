import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Loader2, Plus, Search, RotateCcw, Trash2, Ban, CheckCircle, UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function useManageableUsers() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ["manageable-users", user?.id],
    queryFn: async () => {
      if (isAdmin) {
        // Admins see all users
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const { data: roles } = await supabase.from("user_roles").select("*");
        return (profiles || []).map((p: any) => ({
          ...p,
          roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
        }));
      }

      // Landlords see tenants in their properties
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", user!.id);

      if (!properties?.length) return [];

      const propIds = properties.map((p: any) => p.id);
      const { data: tenants } = await supabase
        .from("tenants")
        .select("user_id, property_id")
        .in("property_id", propIds)
        .not("user_id", "is", null);

      if (!tenants?.length) return [];

      const userIds = [...new Set(tenants.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);

      return (profiles || []).map((p: any) => ({
        ...p,
        roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));
    },
    enabled: !!user,
  });
}

function useUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manageable-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Success", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function LandlordUserManagement() {
  const { isAdmin } = useAuth();
  const { data: users, isLoading } = useManageableUsers();
  const action = useUserAction();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "reset_password" | "delete" | "block" | "unblock";
    userId: string;
    userName: string;
  } | null>(null);
  const [newUser, setNewUser] = useState({ email: "", fullName: "", password: "" });

  const filtered = users?.filter(
    (u: any) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmedAction = () => {
    if (!confirmAction) return;
    action.mutate({ action: confirmAction.type, userId: confirmAction.userId });
    setConfirmAction(null);
  };

  const handleCreate = () => {
    if (!newUser.email || !newUser.fullName) {
      toast({ title: "Error", description: "Email and full name are required", variant: "destructive" });
      return;
    }
    action.mutate(
      {
        action: "create",
        email: newUser.email,
        fullName: newUser.fullName,
        password: newUser.password || undefined,
        role: "tenant",
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewUser({ email: "", fullName: "", password: "" });
        },
      }
    );
  };

  const actionLabels: Record<string, { title: string; desc: string; btn: string }> = {
    reset_password: {
      title: "Reset Password",
      desc: "This will reset the password to TestP@ssword12345. The user will need to change it after logging in.",
      btn: "Reset Password",
    },
    delete: {
      title: "Delete User",
      desc: "This will permanently delete this user account and all associated data. This cannot be undone.",
      btn: "Delete User",
    },
    block: {
      title: "Block Account",
      desc: "This will prevent the user from logging in. They will be unable to access the platform.",
      btn: "Block Account",
    },
    unblock: {
      title: "Unblock Account",
      desc: "This will restore the user's ability to log in.",
      btn: "Unblock Account",
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{filtered?.length || 0} users</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
            {filtered?.map((user: any) => {
              const initials =
                user.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || user.email[0].toUpperCase();

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.length > 0 ? (
                        user.roles.map((role: string) => (
                          <Badge key={role} variant="outline" className="capitalize text-xs">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmAction({
                              type: "reset_password",
                              userId: user.user_id,
                              userName: user.full_name || user.email,
                            })
                          }
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmAction({
                              type: "block",
                              userId: user.user_id,
                              userName: user.full_name || user.email,
                            })
                          }
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Block Account
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmAction({
                              type: "unblock",
                              userId: user.user_id,
                              userName: user.full_name || user.email,
                            })
                          }
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unblock Account
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setConfirmAction({
                              type: "delete",
                              userId: user.user_id,
                              userName: user.full_name || user.email,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && actionLabels[confirmAction.type]?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && (
                <>
                  {actionLabels[confirmAction.type]?.desc}
                  <br />
                  <span className="font-medium mt-2 block">
                    User: {confirmAction.userName}
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={
                confirmAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {action.isPending
                ? "Processing..."
                : confirmAction && actionLabels[confirmAction.type]?.btn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="e.g. john@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input
                type="text"
                placeholder="Default: TestP@ssword12345"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use default password: TestP@ssword12345
              </p>
            </div>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                User will be created with the <Badge variant="outline">tenant</Badge> role.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={action.isPending}>
              {action.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
