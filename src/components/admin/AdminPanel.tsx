import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCog, Shield, Settings2 } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { ConsultantAssignments } from "./ConsultantAssignments";
import { AuditLogViewer } from "./AuditLogViewer";
import { SystemSettings } from "./SystemSettings";

interface AdminPanelProps {
  defaultTab?: "users" | "assignments" | "audit" | "system";
}

export function AdminPanel({ defaultTab = "users" }: AdminPanelProps) {
  return (
    <div className="p-6">
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Users</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="m-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="assignments" className="m-0">
          <ConsultantAssignments />
        </TabsContent>

        <TabsContent value="audit" className="m-0">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="system" className="m-0">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
