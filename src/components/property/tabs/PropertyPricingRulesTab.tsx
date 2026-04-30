import { useState } from "react";
import { Plus, Trash2, Tag, Percent, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule,
  type CreatePricingRuleInput,
} from "@/hooks/usePricingRules";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
  propertyId: string;
}

const blank: CreatePricingRuleInput = {
  property_id: null,
  name: "",
  rule_type: "percent",
  value: 10,
  min_months: null,
  min_nights: null,
  start_date: null,
  end_date: null,
  promo_code: null,
  auto_apply: true,
  active: true,
};

export function PropertyPricingRulesTab({ propertyId }: Props) {
  const { data: rules = [], isLoading } = usePricingRules(propertyId);
  const create = useCreatePricingRule();
  const update = useUpdatePricingRule();
  const del = useDeletePricingRule();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreatePricingRuleInput>(blank);
  const [scope, setScope] = useState<"this" | "all">("this");

  const handleCreate = async () => {
    if (!draft.name || !draft.value) return;
    await create.mutateAsync({
      ...draft,
      property_id: scope === "this" ? propertyId : null,
      promo_code: draft.promo_code?.trim() || null,
    });
    setDraft(blank);
    setScope("this");
    setOpen(false);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pricing & Promotions</h3>
          <p className="text-sm text-muted-foreground">
            Discounts apply automatically at booking creation. Existing bookings are unaffected.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create pricing rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Winter Promo" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <Select value={draft.rule_type} onValueChange={(v: "percent" | "fixed") => setDraft({ ...draft, rule_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent off</SelectItem>
                      <SelectItem value="fixed">Fixed amount off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{draft.rule_type === "percent" ? "% off" : "Amount (NGN)"}</Label>
                  <Input
                    type="number" min={0}
                    value={draft.value}
                    onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Applies to</Label>
                <Select value={scope} onValueChange={(v: "this" | "all") => setScope(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this">This property only</SelectItem>
                    <SelectItem value="all">All my properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Min months</Label>
                  <Input type="number" min={0} value={draft.min_months ?? ""} onChange={(e) => setDraft({ ...draft, min_months: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Min nights</Label>
                  <Input type="number" min={0} value={draft.min_nights ?? ""} onChange={(e) => setDraft({ ...draft, min_nights: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value || null })} />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input type="date" value={draft.end_date ?? ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })} />
                </div>
              </div>
              <div>
                <Label>Promo code (optional)</Label>
                <Input value={draft.promo_code ?? ""} onChange={(e) => setDraft({ ...draft, promo_code: e.target.value })} placeholder="WINTER25" />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">Auto-apply</p>
                  <p className="text-xs text-muted-foreground">If off, requires the promo code above</p>
                </div>
                <Switch checked={draft.auto_apply} onCheckedChange={(v) => setDraft({ ...draft, auto_apply: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={create.isPending || !draft.name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rules…</p>
      ) : rules.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No pricing rules yet. Create one to offer discounts on new bookings.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {r.rule_type === "percent" ? <Percent className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                    {r.name}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{r.property_id ? "This property" : "All properties"}</Badge>
                    {r.promo_code && <Badge variant="outline" className="gap-1"><Tag className="h-3 w-3" />{r.promo_code}</Badge>}
                    {r.auto_apply && <Badge variant="outline">Auto-apply</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.active}
                    onCheckedChange={(v) => update.mutate({ id: r.id, active: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">
                    {r.rule_type === "percent" ? `${r.value}% off` : `${formatCurrency(r.value, "NGN")} off`}
                  </strong>
                  {r.min_months ? ` · min ${r.min_months} months` : ""}
                  {r.min_nights ? ` · min ${r.min_nights} nights` : ""}
                  {r.start_date ? ` · from ${r.start_date}` : ""}
                  {r.end_date ? ` · until ${r.end_date}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
