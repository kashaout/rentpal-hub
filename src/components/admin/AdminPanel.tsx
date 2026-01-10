import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCog } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { ConsultantAssignments } from "./ConsultantAssignments";

interface AdminPanelProps {
  defaultTab?: "users" | "assignments";
}

export function AdminPanel({ defaultTab = "users" }: AdminPanelProps) {
  return (
    <div className="p-6">
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <UserCog className="h-4 w-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="m-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="assignments" className="m-0">
          <ConsultantAssignments />
        </TabsContent>
      </Tabs>
    </div>
  );
}
