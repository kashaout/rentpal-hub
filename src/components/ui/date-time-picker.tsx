import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateTimePickerProps {
  label: string;
  date?: Date;
  onDateChange: (d: Date | undefined) => void;
  time?: string; // "HH:mm"
  onTimeChange: (t: string) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  defaultTime?: string;
}

/**
 * Composite date + time picker. Stores the time as a separate "HH:mm" string —
 * the parent is responsible for combining it with the date for downstream
 * persistence (see `src/lib/bookingTime.ts`).
 */
export function DateTimePicker({
  label,
  date,
  onDateChange,
  time,
  onTimeChange,
  disabled,
  placeholder = "Select date",
  defaultTime,
}: DateTimePickerProps) {
  // When a date is picked but no time is set, seed with the default.
  React.useEffect(() => {
    if (date && !time && defaultTime) onTimeChange(defaultTime);
  }, [date, time, defaultTime, onTimeChange]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
              {date ? format(date, "MMM d, yyyy") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              disabled={disabled}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="time"
            value={time ?? ""}
            onChange={(e) => onTimeChange(e.target.value)}
            className="h-10 w-[110px] pl-7"
            aria-label={`${label} time`}
          />
        </div>
      </div>
    </div>
  );
}
