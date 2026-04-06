import { useState, useEffect } from "react";
import { Settings2, Save, Loader2, DollarSign, Calendar, Building2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemDefaults {
  currency: string;
  lateFeePercentage: number;
  defaultLeaseLengthMonths: number;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
}

const STORAGE_KEY = "rentpal_system_defaults";

const DEFAULT_SETTINGS: SystemDefaults = {
  currency: "NGN",
  lateFeePercentage: 5,
  defaultLeaseLengthMonths: 12,
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
};

export function SystemSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemDefaults>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "System settings saved!" });
    }, 400);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const tables = ["properties", "tenants", "payments", "lease_agreements", "maintenance_requests", "work_orders", "documents", "compliance_items", "financial_transactions"] as const;
      const allData: Record<string, unknown[]> = {};

      for (const table of tables) {
        const { data } = await (supabase.from(table) as any).select("*").limit(1000);
        allData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rentpal-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Data exported successfully!", description: "All data has been downloaded as a JSON backup file." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Financial Defaults</CardTitle>
          <CardDescription>Set default currency and late fee rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={settings.currency} onValueChange={(v) => setSettings({ ...settings, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Late Fee Percentage (%)</Label>
              <Input type="number" min={0} max={100} value={settings.lateFeePercentage} onChange={(e) => setSettings({ ...settings, lateFeePercentage: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Lease Defaults</CardTitle>
          <CardDescription>Set default lease length for new agreements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>Default Lease Length (months)</Label>
            <Input type="number" min={1} max={120} value={settings.defaultLeaseLengthMonths} onChange={(e) => setSettings({ ...settings, defaultLeaseLengthMonths: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Business Information</CardTitle>
          <CardDescription>This information appears on invoices and statements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} placeholder="Your Company Ltd" />
            </div>
            <div className="space-y-2">
              <Label>Business Email</Label>
              <Input type="email" value={settings.businessEmail} onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })} placeholder="info@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Business Phone</Label>
              <Input value={settings.businessPhone} onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })} placeholder="+234..." />
            </div>
            <div className="space-y-2">
              <Label>Business Address</Label>
              <Input value={settings.businessAddress} onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })} placeholder="123 Main Street, Lagos" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      <Separator />

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Data Backup</CardTitle>
          <CardDescription>Export all platform data as a JSON backup file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportAll} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
