"use client";

import { useState } from "react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { Section } from "@/components/common/section";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { getVendorEarningsSummary, listVendorEarnings } from "@/lib/api/finance";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EarningsSummary, LedgerEntryStatus, LedgerEntryType, PaymentMethod } from "@/types/api";

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  sale: "Sale",
  return: "Return",
  refund: "Refund charged",
};

/**
 * The store's earnings as its vendor sees them (DECISIONS FN6, payouts.view): the totals, then
 * the append-only ledger, newest first. A sale counts towards a payout once the return period
 * after delivery is over; returns and refunds charged to the store count at once.
 */
export function VendorEarnings({ vendorId }: { vendorId: string }) {
  const summary = useApi(`earnings-summary:${vendorId}`, () => getVendorEarningsSummary(vendorId));
  const [status, setStatus] = useState<LedgerEntryStatus | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [page, setPage] = useState(1);
  const entries = useApi(`earnings:${vendorId}:${status}:${paymentMethod}:${page}`, () =>
    listVendorEarnings(vendorId, { status, payment_method: paymentMethod, page }),
  );

  return (
    <div className="grid gap-4">
      <Section title="Earnings">
        {summary.error && !summary.data ? (
          <p className="text-sm text-muted-foreground">Could not load the earnings summary.</p>
        ) : !summary.data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <SummaryGrid summary={summary.data} />
        )}
      </Section>

      <ListPanel
        rows={entries.data?.data}
        meta={entries.data?.meta}
        loading={entries.loading}
        error={entries.error}
        onRetry={entries.reload}
        onPage={setPage}
        empty={{
          title: "No earnings yet",
          description: status || paymentMethod ? "Try other filters." : "A sale is recorded when a package is delivered.",
        }}
        filters={
          <>
            <span className="mr-auto font-heading text-headline-sm">Ledger</span>
            <FilterSelect
              label="Statuses"
              value={status}
              onChange={(next) => {
                setStatus(next as LedgerEntryStatus | "");
                setPage(1);
              }}
              options={[
                { value: "pending", label: "Pending (return period)" },
                { value: "available", label: "Available" },
                { value: "released", label: "Released in a payout" },
              ]}
            />
            <FilterSelect
              label="Payment methods"
              value={paymentMethod}
              onChange={(next) => {
                setPaymentMethod(next as PaymentMethod | "");
                setPage(1);
              }}
              options={[
                { value: "online", label: "Paid online" },
                { value: "cash_on_delivery", label: "Cash on delivery" },
              ]}
            />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recorded</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Counts for payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => {
                const negative = entry.amount.startsWith("-");
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.created_at)}</TableCell>
                    <TableCell>{TYPE_LABELS[entry.type] ?? entry.type}</TableCell>
                    <TableCell>
                      <span className="block font-medium">#{entry.order_number}</span>
                      {entry.return_number && (
                        <span className="block text-xs text-muted-foreground">Return {entry.return_number}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {/* Only the parts that are not zero. */}
                      {[
                        Number(entry.paid_by.noqodi) !== 0 && `noqodi ${formatMoney(entry.paid_by.noqodi)}`,
                        Number(entry.paid_by.kachi) !== 0 && `KACHI ${formatMoney(entry.paid_by.kachi)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMoney(entry.commission)}</TableCell>
                    <TableCell className={cn("text-right font-medium", negative ? "text-destructive" : "text-success")}>
                      {negative ? formatMoney(entry.amount) : `+${formatMoney(entry.amount)}`}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col gap-1">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-muted-foreground">
                          {entry.status === "pending"
                            ? `from ${formatDate(entry.available_at)}`
                            : entry.status === "released" && entry.payout_number
                              ? `Payout ${entry.payout_number}`
                              : formatDate(entry.available_at)}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </div>
  );
}

function SummaryGrid({ summary }: { summary: EarningsSummary }) {
  const items = [
    { label: "Earned", value: summary.earned, hint: "After commission, net of returns and refunds" },
    { label: "Commission", value: summary.commission, hint: "KACHI's, net of returns" },
    ...(summary.released !== undefined ? [{ label: "Released", value: summary.released, hint: "Already in payouts" }] : []),
    { label: "Pending", value: summary.pending, hint: "Waiting for the return period to end" },
    { label: "Available", value: summary.available, hint: "Counts towards the next payout" },
  ];
  const cod = summary.cash_on_delivery;
  return (
    <div className="grid gap-4">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/50 p-4">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-lg font-semibold">{formatMoney(item.value)}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{item.hint}</dd>
          </div>
        ))}
      </dl>
      {cod && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Cash-on-delivery share, which KACHI pays the store</h3>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Earned", value: cod.earned, hint: "Net of returns and refunds" },
              { label: "Paid by KACHI", value: cod.paid, hint: "In payouts whose KACHI part was recorded paid" },
              { label: "Due from KACHI", value: cod.due, hint: "Still to pay" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/50 p-4">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-lg font-semibold">{formatMoney(item.value)}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{item.hint}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
