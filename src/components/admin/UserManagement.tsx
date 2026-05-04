import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Plus, X, Search, RotateCcw, Trash2, Ban, CheckCircle, UserPlus, Eye,
} from "lucide-react";
import { AdminUserDetail } from "./AdminUserDetail";
import { AdminLandlordDeleteDialog } from "./AdminLandlordDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useAllUsers, useAddRole, useRemoveRole, UserWithRoles, AppRole,
} from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  consultant: "bg-accent/10 text-accent border-accent/20",
  landlord: "bg-success/10 text-success border-success/20",
  tenant: "bg-primary/10 text-primary border-primary/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
  vendor: "bg-muted text-muted-foreground border-muted",
};

const allRoles: Array<AppRole> = [
  "admin", "consultant", "landlord", "tenant", "maintenance",
];

function useUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("manage-users", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Success", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    user: UserWithRoles;
    role: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "reset_password" | "delete" | "block" | "unblock";
    userId: string;
    userName: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [landlordDelete, setLandlordDelete] = useState<{ userId: string; name: string } | null>(null);
  const [newUser, setNewUser] = useState({ email: "", fullName: "", password: "", role: "tenant" as string });

  const { data: users, isLoading } = useAllUsers();
  const addRole = useAddRole();
  const removeRole = useRemoveRole();
  const action = useUserAction();
  const queryClient = useQueryClient();

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRole = async (userId: string, userEmail: string, role: AppRole) => {
    await addRole.mutateAsync({ userId, userEmail, role });
  };

  const handleRemoveRole = async () => {
    if (confirmRemove) {
      await removeRole.mutateAsync({
        userId: confirmRemove.user.user_id,
        userEmail: confirmRemove.user.email,
        role: confirmRemove.role as AppRole,
      });
      setConfirmRemove(null);
    }
  };

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
        role: newUser.role,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewUser({ email: "", fullName: "", password: "", role: "tenant" });
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

  if (selectedUserId) {
    return <AdminUserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filteredUsers?.length || 0} users
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Users Table */}
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
            {filteredUsers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
            {filteredUsers?.map((user) => {
              const initials =
                user.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || user.email[0].toUpperCase();

              const availableRoles = allRoles.filter(
                (role) => !user.roles.includes(role)
              );

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={cn(
                              "capitalize cursor-pointer group",
                              roleColors[role]
                            )}
                            onClick={() => setConfirmRemove({ user, role })}
                          >
                            {role}
                            <X className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No roles
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
                          onClick={() => setSelectedUserId(user.user_id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {availableRoles.length > 0 && (
                          <>
                            {availableRoles.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleAddRole(user.user_id, user.email, role)}
                                className="capitalize"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add {role} role
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (user.roles.includes("landlord")) {
                              setLandlordDelete({ userId: user.user_id, name: user.full_name || user.email });
                            } else {
                              setConfirmAction({
                                type: "delete",
                                userId: user.user_id,
                                userName: user.full_name || user.email,
                              });
                            }
                          }}
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

      {/* Confirm Remove Role Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the{" "}
              <span className="font-medium capitalize">{confirmRemove?.role}</span>{" "}
              role from{" "}
              <span className="font-medium">
                {confirmRemove?.user.full_name || confirmRemove?.user.email}
              </span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeRole.isPending ? "Removing..." : "Remove Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm User Action Dialog */}
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
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                {allRoles.map((role) => (
                  <option key={role} value={role} className="capitalize">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
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

      {landlordDelete && (
        <AdminLandlordDeleteDialog
          open={!!landlordDelete}
          onOpenChange={(o) => { if (!o) setLandlordDelete(null); }}
          landlordUserId={landlordDelete.userId}
          landlordName={landlordDelete.name}
          onDeleted={() => {
            setLandlordDelete(null);
            queryClient.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      )}
    </div>
  );
}
