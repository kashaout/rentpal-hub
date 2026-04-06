import { useNavigate } from "react-router-dom";
import { Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export function SessionTimeoutDialog() {
  const { showWarning, expired, extendSession } = useSessionTimeout();
  const navigate = useNavigate();

  if (expired) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-destructive" />
              Session Expired
            </DialogTitle>
            <DialogDescription>
              Your session has timed out due to inactivity. Please sign in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate("/auth")} className="gap-2 w-full">
              <LogIn className="h-4 w-4" /> Sign In Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showWarning) {
    return (
      <Dialog open onOpenChange={() => extendSession()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Session Expiring Soon
            </DialogTitle>
            <DialogDescription>
              Your session will expire in about 2 minutes due to inactivity. Click below to stay signed in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button onClick={extendSession} className="w-full">Stay Signed In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
