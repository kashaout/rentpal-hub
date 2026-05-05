import { useState } from "react";
import { MailWarning, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Persistent fixed banner shown until the user confirms their email.
 * Applies to both landlord and tenant sessions.
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  if (!user) return null;
  if ((user as any).email_confirmed_at) return null;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (e: any) {
      toast({ title: "Could not resend", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sticky top-0 z-[200] w-full bg-warning/15 border-b border-warning/30 text-foreground">
      <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-2 flex items-center gap-3 text-sm">
        <MailWarning className="h-4 w-4 text-warning shrink-0" />
        <span className="flex-1">
          Please verify your email to continue. Check your inbox for the confirmation link.
        </span>
        <Button size="sm" variant="outline" onClick={resend} disabled={sending} className="h-7">
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend email"}
        </Button>
      </div>
    </div>
  );
}
