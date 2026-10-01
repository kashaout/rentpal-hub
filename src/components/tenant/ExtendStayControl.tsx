import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtendStay, isInExtendWindow } from "@/hooks/useExtendStay";

interface Props {
  endDate: string;
  bookingId?: string;
  leaseId?: string;
}

export function ExtendStayControl({ endDate, bookingId, leaseId }: Props) {
  const [days, setDays] = useState("1");
  const extend = useExtendStay();
  const open = isInExtendWindow(endDate);

  return (
    <div className="space-y-2 border-t pt-2">
      {open ? (
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
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
            Extend stay
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        You can extend only in the last 6 hours before checkout (12:00 noon on your end date).
      </p>
    </div>
  );
}
