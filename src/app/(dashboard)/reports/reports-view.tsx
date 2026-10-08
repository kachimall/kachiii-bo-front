"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { errorMessage } from "@/lib/api/client";
import { exportReport, getReport, REPORTS } from "@/lib/api/reports";
import { addDays, formatCount, formatDay, uaeToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/store/auth";
import type { Report } from "@/types/api";

const LIMITS = [10, 20, 50, 100];

/**
 * The contract's reports over UAE days (DECISIONS RP1, RP2), each downloadable as a spreadsheet
 * (CSV, ending with a totals row). Filters live in the URL so a report can be shared.
 */
export function ReportsView() {
  const can = useCan();
  const allowed = can("reports.view");
  const query = useQueryState();
  const info = REPORTS.find((r) => r.key === query.get("report")) ?? REPORTS[0];
  const from = query.get("from");
  const to = query.get("to");
  const groupBy = info.groupings.includes(query.get("group_by")) ? query.get("group_by") : (info.groupings[0] ?? "");
  const limit = Number(query.get("limit")) || 20;
  const options = { from, to, group_by: groupBy || undefined, limit: info.key === "best-sellers" ? limit : undefined };
  const { data, error, loading, reload } = useApi(allowed ? `report:${info.key}:${from}:${to}:${groupBy}:${limit}` : null, () =>
    getReport(info.key, options),
  );
  const [exporting, setExporting] = useState(false);

  if (!allowed) return <ForbiddenState />;

  async function download() {
    setExporting(true);
    try {
      const end = to || uaeToday();
      await exportReport(info.key, { ...options, from: from || addDays(end, -29), to: end });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Over UAE days, a year at most. Download any report as a spreadsheet."
        actions={
          <Button variant="outline" onClick={download} disabled={exporting}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {REPORTS.map((report) => (
          <Button
            key={report.key}
            size="sm"
            variant={report.key === info.key ? "default" : "outline"}
            onClick={() => query.set({ report: report.key, group_by: null, limit: null })}
          >
            {report.name}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <PeriodFilter from={from} to={to} onChange={(period) => query.set(period)} />
          {info.groupings.length > 0 && (
            <NativeSelect
              aria-label="Group by"
              className="w-full sm:w-44"
              value={groupBy}
              onChange={(e) => query.set({ group_by: e.target.value === info.groupings[0] ? null : e.target.value })}
            >
              {info.groupings.map((grouping) => (
                <option key={grouping} value={grouping}>
                  By {grouping}
                </option>
              ))}
            </NativeSelect>
          )}
          {info.key === "best-sellers" && (
            <NativeSelect
              aria-label="How many products"
              className="w-full sm:w-36"
              value={String(limit)}
              onChange={(e) => query.set({ limit: e.target.value === "20" ? null : e.target.value })}
            >
              {LIMITS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>
        <div className="border-b px-4 py-3">
          <h2 className="font-heading text-headline-sm">{data?.name ?? info.name}</h2>
          <p className="text-sm text-muted-foreground">
            {info.description}
            {data && ` ${formatDay(data.from)} to ${formatDay(data.to)}.`}
          </p>
        </div>
        {error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data || data.report !== info.key ? (
          <LoadingState />
        ) : data.rows.length === 0 ? (
          <EmptyState title="Nothing in this period" description="Try a longer period." />
        ) : (
          <div className={cn("transition-opacity", loading && "opacity-60")}>
            <ReportTable report={data} />
          </div>
        )}
      </div>
    </>
  );
}

function ReportTable({ report }: { report: Report }) {
  // Figures line up on the right; the first column (the group, rank or name) stays on the left.
  const numeric = new Set(
    report.columns
      .filter((column, index) => index > 0 && report.rows.every((row) => row[column.key] === null || isNumber(row[column.key])))
      .map((column) => column.key),
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {report.columns.map((column) => (
            <TableHead key={column.key} className={cn(numeric.has(column.key) && "text-right")}>
              {column.heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.rows.map((row, index) => (
          <TableRow key={index}>
            {report.columns.map((column) => (
              <TableCell key={column.key} className={cn(numeric.has(column.key) && "text-right tabular-nums")}>
                {cell(row[column.key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {report.totals && (
        <TableFooter>
          <TableRow className="font-medium">
            {report.columns.map((column, index) => (
              <TableCell key={column.key} className={cn(numeric.has(column.key) && "text-right tabular-nums")}>
                {index === 0 ? "Total" : cell(report.totals?.[column.key])}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

function isNumber(value: string | number | null | undefined): boolean {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  // Money comes as "1234.50"; counts as integers.
  return typeof value === "number" ? formatCount(value) : value;
}
