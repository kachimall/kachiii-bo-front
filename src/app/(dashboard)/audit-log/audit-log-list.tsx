"use client";

import { ChevronDownIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { AUDIT_LOGS, listAuditLogs } from "@/lib/api/reports";
import { formatDateTime, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { AuditLogEntry } from "@/types/api";

/**
 * Logins and significant staff actions, newest first (DECISIONS AL1): the Super Admin's alone
 * (audit-logs.view). Each entry says what was done, by whom, when, from which address, and to what.
 */
export function AuditLogList() {
  const can = useCan();
  const allowed = can("audit-logs.view");
  const query = useQueryState();
  const filters = {
    log: query.get("log"),
    event: query.get("event"),
    user_id: query.get("user_id"),
    ip: query.get("ip"),
    from: query.get("from"),
    to: query.get("to"),
  };
  const { data, error, loading, reload } = useApi(allowed ? `audit-logs?${query.key}` : null, () =>
    listAuditLogs({ ...filters, page: query.page }),
  );
  const [open, setOpen] = useState<number | null>(null);

  if (!allowed) return <ForbiddenState message="The audit log is the Super Admin's alone." />;

  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sign-ins and staff actions, newest first, with who did them, when and from where. Days are UAE days."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No entries found", description: filtered ? "Try other filters." : undefined }}
        filters={
          <>
            <FilterSelect label="Logs" value={filters.log} onChange={(value) => query.set({ log: value })} options={AUDIT_LOGS} />
            <SearchInput
              key={`event:${filters.event}`}
              value={filters.event}
              onChange={(value) => query.set({ event: value })}
              placeholder="Exact event, e.g. auth.login"
              className="sm:w-56"
            />
            <SearchInput
              key={`ip:${filters.ip}`}
              value={filters.ip}
              // The API takes a whole address only, so a half-typed one waits.
              onChange={(value) => (value === "" || isIp(value)) && query.set({ ip: value })}
              placeholder="IP address"
              className="sm:w-40"
            />
            <Input
              type="date"
              aria-label="From"
              className="w-auto"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => query.set({ from: e.target.value })}
            />
            <Input
              type="date"
              aria-label="To"
              className="w-auto"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => query.set({ to: e.target.value })}
            />
            {filters.user_id && (
              <Button variant="secondary" size="sm" onClick={() => query.set({ user_id: null })}>
                By one account <XIcon />
              </Button>
            )}
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query.set({ log: null, event: null, user_id: null, ip: null, from: null, to: null })}
              >
                Clear filters
              </Button>
            )}
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>IP address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => {
                const expanded = open === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <TableRow className="cursor-pointer" onClick={() => setOpen(expanded ? null : entry.id)}>
                      <TableCell>
                        {expanded ? (
                          <ChevronDownIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.created_at)}</TableCell>
                      <TableCell>
                        <span className="block font-mono text-xs">{entry.event}</span>
                        {entry.log && <span className="block text-xs text-muted-foreground">{humanize(entry.log)}</span>}
                      </TableCell>
                      <TableCell>
                        {entry.by ? (
                          <button
                            type="button"
                            className="text-left hover:underline"
                            title="Only this account's entries"
                            onClick={(e) => {
                              e.stopPropagation();
                              query.set({ user_id: entry.by!.id });
                            }}
                          >
                            <span className="block font-medium">{entry.by.name}</span>
                            <span className="block text-xs text-muted-foreground">{entry.by.email}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.subject ? (
                          <>
                            <span className="block">{humanize(entry.subject.type)}</span>
                            <span className="block font-mono text-muted-foreground">{entry.subject.id ?? "deleted"}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.ip ?? "—"}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell />
                        <TableCell colSpan={5} className="whitespace-normal">
                          <EntryDetails entry={entry} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}

function isIp(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || (value.includes(":") && /^[0-9a-f:.]+$/i.test(value));
}

function EntryDetails({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="grid gap-3 py-2 text-xs">
      {entry.user_agent && (
        <p>
          <span className="text-muted-foreground">Browser: </span>
          {entry.user_agent}
        </p>
      )}
      {entry.request_id && (
        <p>
          <span className="text-muted-foreground">Request: </span>
          <span className="font-mono">{entry.request_id}</span>
        </p>
      )}
      {entry.details && <Json label="Details" value={entry.details} />}
      {entry.changes && Object.keys(entry.changes).length > 0 && <Json label="Changes" value={entry.changes} />}
      {!entry.user_agent && !entry.details && !entry.changes && <p className="text-muted-foreground">Nothing more was recorded.</p>}
    </div>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
