"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, uaeToday } from "@/lib/format";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "12 months", days: 365 },
];

/**
 * The UAE days a report or the dashboard covers. Empty means the API's default: the last 30
 * days up to today. A year at most (the API refuses more).
 */
export function PeriodFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (period: { from: string; to: string }) => void;
}) {
  const today = uaeToday();
  const presetActive = (days: number) => {
    const end = to || today;
    return end === today && (from || addDays(today, -29)) === addDays(end, -(days - 1));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.days}
            type="button"
            size="sm"
            variant={presetActive(preset.days) ? "secondary" : "ghost"}
            onClick={() => onChange({ from: addDays(today, -(preset.days - 1)), to: today })}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="First day"
          className="w-auto"
          value={from || addDays(to || today, -29)}
          max={to || today}
          onChange={(e) => e.target.value && onChange({ from: e.target.value, to: to || today })}
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="Last day"
          className="w-auto"
          value={to || today}
          max={today}
          onChange={(e) => e.target.value && onChange({ from: from || addDays(e.target.value, -29), to: e.target.value })}
        />
      </div>
    </div>
  );
}
