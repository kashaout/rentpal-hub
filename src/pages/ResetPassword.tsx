import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase places a recovery session on the URL hash; the client picks it up automatically.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // Check hash for type=recovery
        if (window.location.hash.includes("type=recovery")) setReady(true);
      }
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You're now signed in." });
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">RentPal</span>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-8 shadow-elevated">
          <h2 className="text-2xl font-bold text-center mb-6">Set a new password</h2>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              This page must be opened from a password reset email link.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pwd">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd2" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10 rounded-xl" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full gap-2 rounded-xl h-11">
                {loading ? "Updating..." : <>Update password <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
