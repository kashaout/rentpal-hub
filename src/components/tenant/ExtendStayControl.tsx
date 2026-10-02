import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtendStay, hoursUntilStayEnd, EXTEND_WINDOW_HOURS } from "@/hooks/useExtendStay";

interface Props {
  endDate: string;
  bookingId?: string;
  leaseId?: string;
}

function formatRemaining(hours: number): string {
  const totalMin = Math.max(0, Math.floor(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ExtendStayControl({ endDate, bookingId, leaseId }: Props) {
  const [days, setDays] = useState("1");
  const [now, setNow] = useState(() => new Date());
  const extend = useExtendStay();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Display only — the database re-checks the window and ownership.
  const hours = hoursUntilStayEnd(endDate, now);
  const open = hours > 0 && hours <= EXTEND_WINDOW_HOURS;

  return (
    <div className="space-y-2 border-t pt-2">
      {open ? (
        <>
          <p className="text-xs font-medium">Checkout in {formatRemaining(hours)}</p>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays} disabled={extend.isPending}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} day{d > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => extend.mutate({ bookingId, leaseId, extraDays: Number(days) })}
              disabled={extend.isPending}
            >
              {extend.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extend stay
            </Button>
          </div>
        </>
      ) : null}
      <p className="text-xs text-muted-foreground">
        You can extend only in the last 6 hours before checkout (12:00 noon Lagos time on your end date).
      </p>
    </div>
  );
}
