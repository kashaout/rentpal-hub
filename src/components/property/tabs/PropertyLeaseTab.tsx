import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaseTemplateViewer } from "@/components/tenant/LeaseTemplateViewer";

interface Props {
  propertyId: string;
}

export function PropertyLeaseTab({ propertyId }: Props) {
  const [selectedLease, setSelectedLease] = useState<any | null>(null);
  const { data: leases, isLoading } = useQuery({
    queryKey: ["property-leases", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_agreements")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (selectedLease) return <LeaseTemplateViewer agreement={selectedLease} onBack={() => setSelectedLease(null)} />;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!leases?.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No lease agreements found.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {leases.map((lease) => (
          <Button key={lease.id} variant="outline" onClick={() => setSelectedLease(lease)} className="w-full justify-between">
            <span>Unit {lease.unit_number} — {lease.tenant_name}</span>
            <span className="text-xs text-muted-foreground">Open lease</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
