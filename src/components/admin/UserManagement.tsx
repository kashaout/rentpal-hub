import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAllUsers,
  useAddRole,
  useRemoveRole,
  UserWithRoles,
} from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  consultant: "bg-accent/10 text-accent border-accent/20",
  landlord: "bg-success/10 text-success border-success/20",
  tenant: "bg-primary/10 text-primary border-primary/20",
};

const allRoles: Array<"admin" | "consultant" | "landlord" | "tenant"> = [
  "admin",
  "consultant",
  "landlord",
  "tenant",
];

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<{
    user: UserWithRoles;
    role: string;
  } | null>(null);

  const { data: users, isLoading } = useAllUsers();
  const addRole = useAddRole();
  const removeRole = useRemoveRole();

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRole = async (
    userId: string,
    userEmail: string,
    role: "admin" | "consultant" | "landlord" | "tenant"
  ) => {
    await addRole.mutateAsync({ userId, userEmail, role });
  };

  const handleRemoveRole = async () => {
    if (confirmRemove) {
      await removeRole.mutateAsync({
        userId: confirmRemove.user.user_id,
        userEmail: confirmRemove.user.email,
        role: confirmRemove.role as "admin" | "consultant" | "landlord" | "tenant",
      });
      setConfirmRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredUsers?.length || 0} users
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                            onClick={() =>
                              setConfirmRemove({ user, role })
                            }
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
                  <TableCell>
                    {availableRoles.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add Role
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {availableRoles.map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() =>
                                handleAddRole(user.user_id, user.email, role)
                              }
                              className="capitalize"
                            >
                              {role}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Remove Role Dialog */}
      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={() => setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the{" "}
              <span className="font-medium capitalize">
                {confirmRemove?.role}
              </span>{" "}
              role from{" "}
              <span className="font-medium">
                {confirmRemove?.user.full_name || confirmRemove?.user.email}
              </span>
              ?
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
    </div>
  );
}
