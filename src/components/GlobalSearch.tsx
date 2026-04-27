import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Building2, Users, Wrench, FileText, Banknote, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { usePayments } from "@/hooks/usePayments";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/formatCurrency";

interface GlobalSearchProps {
  onNavigate?: (view: string) => void;
}

interface SearchResult {
  type: "property" | "tenant" | "issue" | "payment";
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  icon: React.ElementType;
  view: string;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: issues = [] } = useMaintenanceRequests();
  const { data: payments = [] } = usePayments();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const r: SearchResult[] = [];

    properties?.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)) {
        r.push({ type: "property", id: p.id, title: p.name, subtitle: p.address, icon: Building2, view: `property-command:${p.id}` });
      }
    });

    tenants?.forEach((t: any) => {
      const name = t.profiles?.full_name || t.profiles?.email || "";
      if (name.toLowerCase().includes(q) || t.unit_number?.toLowerCase().includes(q)) {
        r.push({ type: "tenant", id: t.id, title: name, subtitle: `Unit ${t.unit_number}`, status: t.payment_status, icon: Users, view: "tenants" });
      }
    });

    issues?.forEach((i) => {
      if (i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) {
        r.push({ type: "issue", id: i.id, title: i.title, subtitle: i.priority, status: i.status, icon: Wrench, view: "maintenance-portal" });
      }
    });

    payments?.forEach((p: any) => {
      const name = p.tenants?.profiles?.full_name || "";
      if (name.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q)) {
        r.push({ type: "payment", id: p.id, title: `${formatCurrency(p.amount)} — ${name}`, subtitle: p.payment_date, status: p.status, icon: Banknote, view: "finance" });
      }
    });

    return r.slice(0, 12);
  }, [query, properties, tenants, issues, payments]);

  return (
    <div className="relative w-full" ref={ref}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search properties, tenants, issues..."
        className="w-full pl-9 pr-8 rounded-full border bg-secondary/50 focus-visible:ring-primary"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
      />
      {query && (
        <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl border bg-card shadow-elevated z-50 max-h-80 overflow-y-auto">
          {results.map((r) => {
            const typeLabel = r.type === "property" ? "Property" : r.type === "tenant" ? "Tenant" : r.type === "issue" ? "Issue" : "Payment";
            return (
              <button
                key={`${r.type}-${r.id}`}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b last:border-0"
                onClick={() => { onNavigate?.(r.view); setOpen(false); setQuery(""); }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                  <r.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{typeLabel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
                {r.status && <StatusBadge status={r.status} />}
              </button>
            );
          })}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl border bg-card shadow-elevated z-50 p-6 text-center">
          <Search className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
