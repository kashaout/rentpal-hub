import { useState } from "react";
import { ShieldCheck, Upload, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onComplete: () => void;
}

/**
 * Post-signup identity capture. Writes to profiles (date_of_birth,
 * government_id_number, billing_address, id_photo_path) and uploads
 * the ID photo into the private `identity-documents` bucket.
 *
 * Used to pre-fill lease agreements and verify identity before any
 * lease/booking can be created.
 */
export function IdentityWizard({ onComplete }: Props) {
  const { user, refreshRoles } = useAuth();
  const { toast } = useToast();
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id) return;
    if (!dob || !idNumber || !address || !file) {
      toast({ title: "All fields required", description: "Please complete every field and upload your ID.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/id.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("identity-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          date_of_birth: dob,
          government_id_number: idNumber,
          billing_address: { line1: address },
          id_photo_path: path,
          identity_complete: true,
        })
        .eq("user_id", user.id);
      if (profErr) throw profErr;

      await refreshRoles();
      toast({ title: "Identity verified" });
      onComplete();
    } catch (e: any) {
      toast({ title: "Could not save identity", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardContent className="pt-8 pb-6 px-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Verify your identity</h2>
            <p className="text-sm text-muted-foreground">
              Required for leases and bookings. Used to auto-fill your agreements.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gid">Government ID number</Label>
              <Input id="gid" placeholder="e.g. NIN / BVN / Passport No." value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr">Billing address</Label>
              <Textarea id="addr" placeholder="Street, city, state" value={address} onChange={(e) => setAddress(e.target.value)} className="h-20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idphoto">ID photo</Label>
              <label htmlFor="idphoto" className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed px-3 py-3 text-sm hover:bg-muted/40">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{file ? file.name : "Upload photo of your ID"}</span>
              </label>
              <input id="idphoto" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">Stored privately. Only you and admins can view it.</p>
            </div>
          </div>

          <Button onClick={submit} disabled={busy} className="w-full gap-2">
            {busy ? "Saving..." : <>Verify & continue <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <button onClick={onComplete} className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline">
            Skip for now
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
