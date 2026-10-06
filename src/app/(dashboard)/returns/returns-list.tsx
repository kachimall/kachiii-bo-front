"use client";

import Link from "next/link";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listReturns } from "@/lib/api/returns";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { ReturnReason, ReturnStatus } from "@/types/api";

/** ReturnReason::label() */
export const RETURN_REASONS: Record<ReturnReason, string> = {
  damaged: "Arrived damaged",
  defective: "Does not work",
  wrong_item: "Wrong item, size or colour",
  not_as_described: "Not as described",
  missing_parts: "Parts or accessories missing",
  other: "Another reason",
};

const STATUSES: { value: ReturnStatus; label: string }[] = [
  { value: "escalated", label: "Escalated to KACHI" },
  { value: "requested", label: "Waiting for the store" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "received", label: "Received" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function ReturnsList() {
  const can = useCan();
  const allowed = can("orders.view");
  const query = useQueryState();
  const filters = { q: query.get("q"), status: query.get("status") as ReturnStatus | "" };
  const { data, error, loading, reload } = useApi(allowed ? `returns?${query.key}` : null, () =>
    listReturns({ ...filters, page: query.page }),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Returns"
        description="Return requests from buyers. Escalated ones wait for KACHI: the store did not answer in time, or the buyer disputed its rejection."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No returns found", description: "Try other filters." }}
        filters={
          <>
            <SearchInput value={filters.q} onChange={(q) => query.set({ q })} placeholder="Return or order number" />
            <FilterSelect label="Statuses" value={filters.status} onChange={(status) => query.set({ status })} options={STATUSES} />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Refund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((ret) => (
                <TableRow key={ret.id}>
                  <TableCell>
                    <Link href={`/returns/${ret.id}`} className="font-medium hover:underline">
                      {ret.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${ret.order.id}`} className="block hover:underline">
                      {ret.store_order.number}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{ret.store_order.store_name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{ret.buyer?.name ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">{ret.buyer?.email}</span>
                  </TableCell>
                  <TableCell>{RETURN_REASONS[ret.reason] ?? ret.reason}</TableCell>
                  <TableCell>
                    <StatusBadge status={ret.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(ret.created_at)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(ret.refund_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
