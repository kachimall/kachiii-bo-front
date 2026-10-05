"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, EmptyState, LoadingState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { getBuyer, sendBuyerPasswordReset, setBuyerStatus } from "@/lib/api/buyers";
import { listOrders } from "@/lib/api/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Buyer } from "@/types/api";

export function BuyerDetail({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi(`buyer:${id}`, () => getBuyer(id));
  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(buyer) => <BuyerView buyer={buyer} onChange={mutate} />}
    </AsyncContent>
  );
}

function BuyerView({ buyer, onChange }: { buyer: Buyer; onChange: (buyer: Buyer) => void }) {
  const can = useCan();
  const canManage = can("customers.manage");
  const [confirm, setConfirm] = useState<"status" | "reset" | null>(null);
  const suspended = buyer.status === "suspended";

  return (
    <>
      <PageHeader
        back={{ href: "/buyers", label: "Buyers" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {buyer.name} <StatusBadge status={buyer.status} />
          </span>
        }
        description={buyer.email}
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setConfirm("reset")}>
                Send password reset
              </Button>
              <Button variant={suspended ? "default" : "destructive"} onClick={() => setConfirm("status")}>
                {suspended ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Account" className="h-fit">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Email", value: buyer.email },
              { label: "Email verified", value: buyer.email_verified ? "Yes" : "No" },
              { label: "Phone", value: buyer.phone ?? "—" },
              { label: "Joined", value: formatDateTime(buyer.created_at) },
            ]}
          />
        </Section>
        {can("orders.view") && <BuyerOrders email={buyer.email} />}
      </div>

      <ConfirmDialog
        open={confirm === "status"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={suspended ? `Reactivate ${buyer.name}?` : `Suspend ${buyer.name}?`}
        description={
          suspended
            ? "They can sign in and shop again."
            : "They are signed out everywhere and cannot sign in until reactivated."
        }
        confirmLabel={suspended ? "Reactivate" : "Suspend"}
        destructive={!suspended}
        onConfirm={() =>
          runAction(
            async () => onChange(await setBuyerStatus(buyer.id, suspended ? "active" : "suspended")),
            suspended ? "Buyer reactivated." : "Buyer suspended.",
          )
        }
      />
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Send a password reset link?"
        description={`An email with a link to choose a new password goes to ${buyer.email}.`}
        confirmLabel="Send link"
        onConfirm={() => runAction(() => sendBuyerPasswordReset(buyer.id), "Password reset link sent.")}
      />
    </>
  );
}

/** The buyer's latest orders: the orders search matches the buyer's email. */
function BuyerOrders({ email }: { email: string }) {
  const { data, error } = useApi(`buyer-orders:${email}`, () => listOrders({ q: email, per_page: 10 }));

  return (
    <Section
      title="Recent orders"
      className="lg:col-span-2"
      flush
      actions={
        <Link href={`/orders?q=${encodeURIComponent(email)}`} className="text-sm text-secondary hover:underline">
          View all
        </Link>
      }
    >
      {error ? (
        <p className="p-5 text-sm text-muted-foreground">Could not load the orders.</p>
      ) : !data ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="pl-5">
                  <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                    {order.number}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(order.placed_at ?? order.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="pr-5 text-right">{formatMoney(order.grand_total, order.currency_code)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}
