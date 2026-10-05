"use client";

import Link from "next/link";
import { FlagIcon } from "lucide-react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listOrders } from "@/lib/api/orders";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";

export function OrdersList() {
  const can = useCan();
  const allowed = can("orders.view");
  const query = useQueryState();
  const filters = {
    q: query.get("q"),
    status: query.get("status"),
    payment_status: query.get("payment_status"),
    payment_method: query.get("payment_method"),
    flagged: query.get("flagged"),
  };
  const { data, error, loading, reload } = useApi(allowed ? `orders?${query.key}` : null, () =>
    listOrders({
      ...filters,
      flagged: filters.flagged === "" ? undefined : filters.flagged === "1",
      page: query.page,
    }),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader title="Orders" description="Every purchase, with the order each store fulfils. Newest first." />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No orders found", description: "Try other filters." }}
        filters={
          <>
            <SearchInput value={filters.q} onChange={(q) => query.set({ q })} placeholder="Order number or buyer email" />
            <FilterSelect label="Statuses" value={filters.status} onChange={(status) => query.set({ status })} options={["pending", "placed", "cancelled"]} />
            <FilterSelect
              label="Payment statuses"
              value={filters.payment_status}
              onChange={(payment_status) => query.set({ payment_status })}
              options={["unpaid", "paid", "due_on_delivery"]}
            />
            <FilterSelect
              label="Payment methods"
              value={filters.payment_method}
              onChange={(payment_method) => query.set({ payment_method })}
              options={[
                { value: "online", label: "Online" },
                { value: "cash_on_delivery", label: "Cash on delivery" },
              ]}
            />
            <FilterSelect
              label="Orders"
              value={filters.flagged}
              onChange={(flagged) => query.set({ flagged })}
              options={[
                { value: "1", label: "Flagged only" },
                { value: "0", label: "Not flagged" },
              ]}
            />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Stores</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                      {order.number}
                      {order.flagged_at && <FlagIcon className="size-3.5 text-destructive" aria-label="Flagged" />}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="block">{order.buyer?.name ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">{order.buyer?.email ?? order.contact_email}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(order.placed_at ?? order.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col gap-1">
                      <StatusBadge status={order.payment_status} />
                      <span className="text-xs text-muted-foreground">{humanize(order.payment_method)}</span>
                    </span>
                  </TableCell>
                  <TableCell>{order.orders.length}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(order.grand_total, order.currency_code)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
