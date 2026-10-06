"use client";

import Link from "next/link";
import { FileTextIcon, FlagIcon, PackageCheckIcon, RotateCwIcon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CourierUpdateDialog } from "@/components/common/courier-update-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { RestockDialog } from "@/components/common/restock-dialog";
import { Section } from "@/components/common/section";
import { AsyncContent } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { errorMessage } from "@/lib/api/client";
import { retryRefund } from "@/lib/api/finance";
import {
  MOCK_COURIER,
  cancelVendorOrder,
  getOrder,
  issueRefund,
  openWaybill,
  receivePackageBack,
  sendCourierUpdate,
} from "@/lib/api/orders";
import { addressLines, formatDateTime, formatMoney, formatOptions, humanize } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Purchase, Refund, Shipment, VendorOrder } from "@/types/api";
import { RefundDialog } from "./refund-dialog";

// Staff may cancel a store's order until it ships (VendorOrderStatus::canBeCancelledBy).
const CANCELLABLE = new Set(["placed", "accepted", "ready_to_ship"]);

export function OrderDetail({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi(`order:${id}`, () => getOrder(id));
  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(order) => <OrderView order={order} onChange={mutate} onReload={reload} />}
    </AsyncContent>
  );
}

function OrderView({ order, onChange, onReload }: { order: Purchase; onChange: (order: Purchase) => void; onReload: () => void }) {
  const can = useCan();
  const [cancelling, setCancelling] = useState<VendorOrder | null>(null);
  const [updating, setUpdating] = useState<Shipment | null>(null);
  const [receiving, setReceiving] = useState<Shipment | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  // Only an order paid online is refunded here; cash on delivery is refunded outside the platform.
  const refundable = order.payment_method === "online" && order.payment_status === "paid";
  const money = (amount: string | null | undefined) => formatMoney(amount, order.currency_code);
  const address = addressLines(order.shipping_address);

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Order {order.number} <StatusBadge status={order.status} />
          </span>
        }
        description={`Placed ${formatDateTime(order.placed_at ?? order.created_at)}`}
        actions={
          <>
            <ButtonLink href={`/returns?q=${encodeURIComponent(order.number)}`} variant="outline">
              Returns
            </ButtonLink>
            {can("refunds.manage") && refundable && <Button onClick={() => setRefunding(true)}>Issue refund</Button>}
          </>
        }
      />

      {order.flagged_at && (
        <div className="mb-6 flex gap-3 rounded-xl bg-destructive/5 p-4 text-sm ring-1 ring-destructive/20">
          <FlagIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>
            Flagged {formatDateTime(order.flagged_at)} after {order.payment_failures ?? "repeated"} failed payment attempts.
          </p>
        </div>
      )}
      {order.cancel_reason && (
        <div className="mb-6 rounded-xl bg-muted p-4 text-sm">
          <span className="font-medium">Cancelled {formatDateTime(order.cancelled_at)}:</span> {order.cancel_reason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          {order.orders.map((vendorOrder) => (
            <Section
              key={vendorOrder.id}
              flush
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {vendorOrder.store.name}
                  <span className="text-sm font-normal text-muted-foreground">#{vendorOrder.number}</span>
                  <StatusBadge status={vendorOrder.status} />
                </span>
              }
              actions={
                can("orders.manage") &&
                CANCELLABLE.has(vendorOrder.status) && (
                  <Button variant="destructive" size="sm" onClick={() => setCancelling(vendorOrder)}>
                    Cancel order
                  </Button>
                )
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="pr-5 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5">
                        <Link href={`/products/${item.product.id}`} className="flex items-center gap-3 hover:underline">
                          <Thumb src={item.thumbnail_url} alt="" className="size-9" />
                          <span className="min-w-0">
                            <span className="block max-w-xs truncate font-medium">{item.product.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {formatOptions(item.variant.options)} · {item.variant.sku}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{money(item.unit_price)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.discount_amount === "0.00" ? "—" : money(item.discount_amount)}</TableCell>
                      <TableCell className="pr-5 text-right">{money(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="grid gap-4 border-t p-5 text-sm sm:grid-cols-2">
                <DetailList
                  className="sm:grid-cols-2"
                  items={[
                    { label: "Items", value: money(vendorOrder.items_total) },
                    { label: "Discount", value: money(vendorOrder.discount_total) },
                    { label: "Commission", value: vendorOrder.commission_total ? money(vendorOrder.commission_total) : "—" },
                    { label: "Vendor earnings", value: vendorOrder.earnings ? money(vendorOrder.earnings) : "—" },
                    ...(vendorOrder.refund_amount !== "0.00" ? [{ label: "Refunded", value: money(vendorOrder.refund_amount) }] : []),
                  ]}
                />
                <DetailList
                  className="sm:grid-cols-2"
                  items={[
                    { label: "Ship by", value: formatDateTime(vendorOrder.ship_by) },
                    { label: "Accepted", value: formatDateTime(vendorOrder.accepted_at) },
                    { label: "Shipped", value: formatDateTime(vendorOrder.shipped_at) },
                    { label: "Delivered", value: formatDateTime(vendorOrder.delivered_at) },
                    ...(vendorOrder.returned_at ? [{ label: "Returned", value: formatDateTime(vendorOrder.returned_at) }] : []),
                  ]}
                />
                {vendorOrder.cancelled_at && (
                  <p className="text-muted-foreground sm:col-span-2">
                    Cancelled by {humanize(vendorOrder.cancelled_by)} {formatDateTime(vendorOrder.cancelled_at)}
                    {vendorOrder.cancel_reason ? `: ${vendorOrder.cancel_reason}` : ""}
                  </p>
                )}
              </div>
            </Section>
          ))}

          {order.packages.length > 0 && (
            <Section title="Packages" flush>
              <ul className="divide-y">
                {order.packages.map((pkg) => (
                  <PackageItem
                    key={pkg.id}
                    pkg={pkg}
                    storeName={order.orders.find((o) => o.id === pkg.order_id)?.store.name}
                    money={money}
                    onWaybill={() => openWaybill(order.id, pkg.id).catch((e) => toast.error(errorMessage(e)))}
                    onCourierUpdate={MOCK_COURIER && can("orders.manage") ? () => setUpdating(pkg) : undefined}
                    onReceivedBack={can("orders.manage") ? () => setReceiving(pkg) : undefined}
                  />
                ))}
              </ul>
            </Section>
          )}

          {order.refunds && order.refunds.length > 0 && (
            <Section title="Refunds" flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Charged to</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.refunds.map((refund) => (
                    <RefundRow
                      key={refund.id}
                      refund={refund}
                      money={money}
                      retrying={retrying === refund.id}
                      onRetry={
                        can("refunds.manage") && refund.status === "failed"
                          ? async () => {
                              setRetrying(refund.id);
                              if (await runAction(() => retryRefund(refund.id), "Refund tried again.")) onReload();
                              setRetrying(null);
                            }
                          : undefined
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {order.payments && order.payments.length > 0 && (
            <Section title="Payment attempts" flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="pr-5 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="pl-5 whitespace-nowrap">{formatDateTime(payment.created_at)}</TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payment.reference ?? "—"}</TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground" title={payment.failure_reason ?? undefined}>
                        {payment.failure_reason ?? (payment.paid_at ? `Paid ${formatDateTime(payment.paid_at)}` : "—")}
                      </TableCell>
                      <TableCell className="pr-5 text-right">{money(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}
        </div>

        <div className="grid h-fit gap-6">
          <Section title="Summary">
            <dl className="grid gap-2 text-sm">
              <SummaryRow label="Items" value={money(order.items_total)} />
              <SummaryRow
                label={order.voucher_code ? `Discount (${order.voucher_code})` : "Discount"}
                value={order.discount_total === "0.00" ? "—" : `− ${money(order.discount_total)}`}
              />
              <SummaryRow label="Shipping" value={money(order.shipping_total)} />
              <div className="my-1 border-t" />
              <SummaryRow label="Total" value={money(order.grand_total)} strong />
            </dl>
          </Section>

          <Section title="Payment">
            <DetailList
              className="sm:grid-cols-1"
              items={[
                { label: "Method", value: humanize(order.payment_method) },
                { label: "Status", value: <StatusBadge status={order.payment_status} /> },
                { label: "Paid", value: formatDateTime(order.paid_at) },
                ...(order.pay_by ? [{ label: "Pay by", value: formatDateTime(order.pay_by) }] : []),
                ...(order.payment?.failure_reason ? [{ label: "Last failure", value: order.payment.failure_reason }] : []),
              ]}
            />
          </Section>

          <Section title="Buyer">
            <DetailList
              className="sm:grid-cols-1"
              items={[
                {
                  label: "Name",
                  value:
                    order.buyer && can("customers.view") ? (
                      <Link href={`/buyers/${order.buyer.id}`} className="text-secondary hover:underline">
                        {order.buyer.name}
                      </Link>
                    ) : (
                      (order.buyer?.name ?? "—")
                    ),
                },
                { label: "Email", value: order.buyer?.email ?? order.contact_email },
                {
                  label: "Ship to",
                  value:
                    address.length > 0 ? (
                      <span className="block whitespace-pre-line">{address.join("\n")}</span>
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          </Section>
        </div>
      </div>

      <CourierUpdateDialog
        target={
          updating?.waybill_number
            ? {
                waybill: updating.waybill_number,
                courierStatus: updating.courier_status,
                description: "The buyer gets the shipped and delivered emails.",
                returnedHint: "“refused” counts against the buyer’s cash on delivery.",
              }
            : null
        }
        onOpenChange={(open) => !open && setUpdating(null)}
        onSubmit={async (status, reason) => {
          if (!updating) return;
          onChange(await sendCourierUpdate(order.id, updating.id, status, reason));
          toast.success("Courier update recorded.");
        }}
      />

      <RestockDialog
        open={receiving !== null}
        onOpenChange={(open) => !open && setReceiving(null)}
        title="Package received back?"
        description="Confirms the courier's returned package is back with its sender. A buyer who paid online is refunded for its items (not the delivery)."
        confirmLabel="Confirm received"
        onSubmit={async (restock) => {
          if (!receiving) return;
          onChange(await receivePackageBack(order.id, receiving.id, restock));
          toast.success("Package received back.");
        }}
      />

      <RefundDialog
        order={order}
        open={refunding}
        onOpenChange={setRefunding}
        onSubmit={async (body) => {
          await issueRefund(order.id, body);
          toast.success("Refund issued.");
          onReload();
        }}
      />

      <ReasonDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.store.name ?? "this store"}'s order?`}
        description="Stock is released and the buyer is told. The reason is shown to them after “Cancelled by KACHI:”."
        confirmLabel="Cancel order"
        destructive
        required
        min={1}
        max={200}
        onSubmit={async (reason) => {
          if (!cancelling || !reason) return;
          onChange(await cancelVendorOrder(order.id, cancelling.id, reason));
          toast.success("Order cancelled.");
        }}
      />
    </>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between font-semibold" : "flex justify-between"}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RefundRow({
  refund,
  money,
  retrying,
  onRetry,
}: {
  refund: Refund;
  money: (a: string) => string;
  retrying: boolean;
  onRetry?: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="pl-5 whitespace-nowrap">{formatDateTime(refund.created_at)}</TableCell>
      <TableCell>
        <StatusBadge status={refund.status} />
      </TableCell>
      <TableCell className="max-w-64">
        <span className="block truncate" title={refund.reason}>
          {refund.reason}
        </span>
        {refund.failure_reason && <span className="block truncate text-xs text-destructive">{refund.failure_reason}</span>}
        {refund.store_order && <span className="block text-xs text-muted-foreground">#{refund.store_order}</span>}
      </TableCell>
      <TableCell>{refund.charged_to ? humanize(refund.charged_to) : "—"}</TableCell>
      <TableCell className="text-right">{money(refund.amount)}</TableCell>
      <TableCell className="pr-5 text-right">
        {onRetry && (
          <Button variant="outline" size="xs" onClick={onRetry} disabled={retrying}>
            <RotateCwIcon className={retrying ? "animate-spin" : undefined} /> Retry
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

const FINAL = new Set(["delivered", "returned", "cancelled"]);

function PackageItem({
  pkg,
  storeName,
  money,
  onWaybill,
  onCourierUpdate,
  onReceivedBack,
}: {
  pkg: Shipment;
  storeName?: string;
  money: (a: string) => string;
  onWaybill: () => void;
  /** Only while the backend runs the mock courier; it answers 404 otherwise. */
  onCourierUpdate?: () => void;
  onReceivedBack?: () => void;
}) {
  const steps = [...(pkg.tracking ?? [])].reverse();
  const movable = pkg.waybill_number !== null && !FINAL.has(pkg.status);
  // The courier brought it back undelivered; its sender has not confirmed it is back yet.
  const awaitingReceipt = pkg.status === "returned" && !pkg.received_back_at;

  return (
    <li className="grid gap-3 p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {pkg.service.name}
            {storeName && <span className="font-normal text-muted-foreground"> · {storeName}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {humanize(pkg.fulfiller)} · {(pkg.weight_grams / 1000).toFixed(2)} kg · {money(pkg.fee)}
            {pkg.quoted_fee ? ` (courier rate ${money(pkg.quoted_fee)})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={pkg.status} />
          {pkg.courier_status && <StatusBadge status={pkg.courier_status} />}
        </div>
      </div>

      <DetailList
        className="sm:grid-cols-4"
        items={[
          { label: "Waybill", value: pkg.waybill_number ? <span className="font-mono">{pkg.waybill_number}</span> : "Not booked" },
          { label: "Booked", value: formatDateTime(pkg.booked_at) },
          {
            label: "Delivery",
            value: pkg.delivered_at
              ? `Delivered ${formatDateTime(pkg.delivered_at)}`
              : pkg.returned_at
                ? `Returned ${formatDateTime(pkg.returned_at)}${pkg.received_back_at ? ` · received back ${formatDateTime(pkg.received_back_at)}` : ""}`
                : pkg.shipped_at
                  ? `Shipped ${formatDateTime(pkg.shipped_at)}`
                  : `${pkg.min_days}–${pkg.max_days} days`,
          },
          ...(pkg.return_by ? [{ label: "Returnable until", value: formatDateTime(pkg.return_by) }] : []),
          {
            label: "Cash on delivery",
            value: pkg.cash_on_delivery ? (
              <span className="flex items-center gap-2">
                {money(pkg.cash_on_delivery.amount)} <StatusBadge status={pkg.cash_on_delivery.status} />
              </span>
            ) : (
              "Paid online"
            ),
          },
        ]}
      />

      {steps.length > 0 && (
        <ol className="grid gap-2 border-l pl-4">
          {steps.map((step) => (
            <li key={`${step.status}-${step.occurred_at}`}>
              <span className="font-medium">{step.description ?? humanize(step.status)}</span>
              {step.reason && <span className="text-muted-foreground"> ({step.reason})</span>}
              <span className="block text-xs text-muted-foreground">{formatDateTime(step.occurred_at)}</span>
            </li>
          ))}
        </ol>
      )}

      {(pkg.waybill_ready || (onCourierUpdate && movable) || (onReceivedBack && awaitingReceipt)) && (
        <div className="flex flex-wrap gap-2">
          {pkg.waybill_ready && (
            <Button variant="outline" size="sm" onClick={onWaybill}>
              <FileTextIcon />
              Waybill
            </Button>
          )}
          {onCourierUpdate && movable && (
            <Button variant="outline" size="sm" onClick={onCourierUpdate}>
              <TruckIcon />
              Courier update
            </Button>
          )}
          {onReceivedBack && awaitingReceipt && (
            <Button variant="outline" size="sm" onClick={onReceivedBack}>
              <PackageCheckIcon />
              Confirm received back
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
