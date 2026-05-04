import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordUserId: string;
  landlordName: string;
  onDeleted?: () => void;
}

interface Summary {
  properties: number;
  bookings: number;
  leases: number;
  active_leases: number;
  payments: number;
  maintenance_requests: number;
  documents: number;
  images: number;
}

/**
 * Admin-only landlord cascade delete. Calls rpc_admin_landlord_delete_summary
 * to compute counts, then admin-delete-landlord edge function (which uses the
 * service role + RPC to actually delete — including auth.users + storage).
 * Deletion is BLOCKED if active signed leases exist (enforced server-side).
 */
export function AdminLandlordDeleteDialog({ open, onOpenChange, landlordUserId, landlordName, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!open) {
      setSummary(null);
      setConfirm("");
      return;
    }
    setLoading(true);
    supabase
      .rpc("rpc_admin_landlord_delete_summary" as any, { _landlord_user_id: landlordUserId })
      .then(({ data, error }: any) => {
        if (error) {
          toast({ title: "Could not load summary", description: error.message, variant: "destructive" });
          onOpenChange(false);
          return;
        }
        setSummary(data as Summary);
      })
      .then(() => setLoading(false));
  }, [open, landlordUserId, onOpenChange]);

  const blocked = (summary?.active_leases ?? 0) > 0;
  const matches = confirm.trim().toUpperCase() === "DELETE";

  const onConfirm = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-landlord", {
      body: { landlordUserId },
    });
    setDeleting(false);
    if (error || data?.error) {
      toast({
        title: "Delete failed",
        description: data?.error || error?.message || "Could not delete landlord.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Landlord deleted", description: `${landlordName} and all owned data have been removed.` });
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Landlord
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                This will permanently delete <span className="font-semibold text-foreground">{landlordName}</span> and ALL owned data:
              </p>
              {loading || !summary ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading summary…
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-3 text-foreground">
                  <li>• {summary.properties} properties</li>
                  <li>• {summary.images} images</li>
                  <li>• {summary.bookings} bookings</li>
                  <li>• {summary.leases} leases</li>
                  <li>• {summary.payments} payments</li>
                  <li>• {summary.maintenance_requests} maintenance requests</li>
                  <li>• {summary.documents} documents</li>
                  <li className="font-medium">• {summary.active_leases} ACTIVE signed leases</li>
                </ul>
              )}
              {blocked && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                  Cannot delete: this landlord has {summary?.active_leases} active signed lease(s). Terminate them first.
                </div>
              )}
              {!blocked && summary && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
                  <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked || !matches || deleting || loading}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete landlord"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
