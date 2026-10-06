"use client";

import Link from "next/link";
import { RotateCwIcon } from "lucide-react";
import { useState } from "react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listRefunds, retryRefund } from "@/lib/api/finance";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { RefundStatus } from "@/types/api";

export function RefundsList() {
  const can = useCan();
  const allowed = can("payments.view");
  const canManage = can("refunds.manage");
  const query = useQueryState();
  const status = query.get("status") as RefundStatus | "";
  const { data, error, loading, reload } = useApi(allowed ? `refunds?${query.key}` : null, () =>
    listRefunds({ status, page: query.page }),
  );
  const [retrying, setRetrying] = useState<string | null>(null);

  if (!allowed) return <ForbiddenState />;

  async function retry(id: string) {
    setRetrying(id);
    if (await runAction(() => retryRefund(id), "Refund tried again.")) reload();
    setRetrying(null);
  }

  return (
    <>
      <PageHeader
        title="Refunds"
        description="Money owed back to buyers who paid online, newest first. Failed ones were refused by the gateway and wait for another try."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No refunds found", description: "Try another status." }}
        filters={
          <FilterSelect
            label="Statuses"
            value={status}
            onChange={(next) => query.set({ status: next })}
            options={["failed", "pending", "processing", "succeeded"]}
          />
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Charged to</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((refund) => (
                <TableRow key={refund.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(refund.created_at)}</TableCell>
                  <TableCell>
                    {refund.order ? (
                      <Link href={`/orders/${refund.order.id}`} className="block font-medium hover:underline">
                        {refund.order.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {refund.store_order && <span className="block text-xs text-muted-foreground">#{refund.store_order}</span>}
                  </TableCell>
                  <TableCell className="max-w-64">
                    <span className="block truncate" title={refund.reason}>
                      {refund.reason}
                    </span>
                    {refund.failure_reason && (
                      <span className="block truncate text-xs text-destructive" title={refund.failure_reason}>
                        {refund.failure_reason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col gap-1">
                      <StatusBadge status={refund.status} />
                      <span className="text-xs text-muted-foreground">
                        {refund.status === "succeeded"
                          ? formatDateTime(refund.refunded_at)
                          : refund.attempts
                            ? `${refund.attempts} ${refund.attempts === 1 ? "try" : "tries"}`
                            : ""}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{refund.charged_to ? humanize(refund.charged_to) : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{refund.reference ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(refund.amount)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {refund.status === "failed" && (
                        <Button variant="outline" size="xs" onClick={() => retry(refund.id)} disabled={retrying === refund.id}>
                          <RotateCwIcon className={retrying === refund.id ? "animate-spin" : undefined} /> Retry
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
