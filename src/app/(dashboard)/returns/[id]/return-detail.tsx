"use client";

import Link from "next/link";
import { ImageOffIcon, Loader2Icon, PackageCheckIcon, TruckIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { MOCK_COURIER } from "@/lib/api/orders";
import { decideReturn, getReturn, getReturnPhoto, receiveReturn, sendReturnCourierUpdate } from "@/lib/api/returns";
import { formatDateTime, formatMoney, formatOptions, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { ReturnAnswer, ReturnDecision, ReturnRequest } from "@/types/api";
import { RETURN_REASONS } from "../returns-list";

export function ReturnDetail({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi(`return:${id}`, () => getReturn(id));
  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(ret) => <ReturnView ret={ret} onChange={mutate} />}
    </AsyncContent>
  );
}

function ReturnView({ ret, onChange }: { ret: ReturnRequest; onChange: (ret: ReturnRequest) => void }) {
  const can = useCan();
  const canManage = can("orders.manage");
  const [deciding, setDeciding] = useState<ReturnDecision | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const pickup = ret.pickup;
  // The courier is still bringing the items back.
  const pickupMovable =
    ret.status === "approved" &&
    pickup !== null &&
    pickup.cancelled_at === null &&
    pickup.courier_status !== "delivered" &&
    pickup.courier_status !== "returned";

  return (
    <>
      <PageHeader
        back={{ href: "/returns", label: "Returns" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Return {ret.number} <StatusBadge status={ret.status} />
          </span>
        }
        description={`Requested ${formatDateTime(ret.created_at)} for ${ret.store_order.store_name}'s order #${ret.store_order.number}`}
        actions={
          canManage && (
            <>
              {ret.status === "escalated" && (
                <>
                  <Button variant="destructive" onClick={() => setDeciding("rejected")}>
                    Reject
                  </Button>
                  <Button onClick={() => setDeciding("approved")}>Approve</Button>
                </>
              )}
              {MOCK_COURIER && pickupMovable && (
                <Button variant="outline" onClick={() => setUpdating(true)}>
                  <TruckIcon /> Courier update
                </Button>
              )}
              {ret.status === "approved" && (
                <Button onClick={() => setReceiving(true)}>
                  <PackageCheckIcon /> Confirm received
                </Button>
              )}
            </>
          )
        }
      />

      {ret.status === "escalated" && (
        <div className="mb-6 rounded-xl bg-tertiary-fixed/40 p-4 text-sm ring-1 ring-tertiary/20">
          <span className="font-medium">KACHI decides this request</span>
          {ret.escalated_at ? ` (escalated ${formatDateTime(ret.escalated_at)})` : ""}:{" "}
          {ret.dispute_reason
            ? "the buyer disputed the store's rejection."
            : "the store did not answer in time."}{" "}
          The decision is final; the buyer and the store are emailed.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Section title="Items" flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="pr-5 text-right">Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ret.items.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-3">
                        <Thumb src={item.thumbnail_url} alt="" className="size-9" />
                        <span className="min-w-0">
                          <span className="block max-w-xs truncate font-medium">{item.product_name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatOptions(item.options)} · {item.sku}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="pr-5 text-right">{formatMoney(item.refund_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between border-t px-5 py-3 text-sm font-semibold">
              <span>Refund to the buyer</span>
              <span>{formatMoney(ret.refund_amount)}</span>
            </div>
          </Section>

          <Section title="The buyer's request">
            <DetailList
              items={[
                { label: "Reason", value: RETURN_REASONS[ret.reason] ?? humanize(ret.reason) },
                { label: "Store replies by", value: formatDateTime(ret.reply_by) },
                { label: "Details", value: ret.details ?? "—", wide: true },
                ...(ret.dispute_reason ? [{ label: "Why the buyer disputes the rejection", value: ret.dispute_reason, wide: true }] : []),
              ]}
            />
            {ret.photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ret.photos.map((_, index) => (
                  <ReturnPhoto key={index} returnId={ret.id} number={index + 1} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Answers">
            <div className="grid gap-5 sm:grid-cols-2">
              <Answer title="The store" answer={ret.store_answer} empty={ret.status === "requested" ? "Waiting for the store." : "No answer."} />
              <Answer
                title="KACHI"
                answer={ret.kachi_decision}
                by={ret.decided_by}
                empty={ret.status === "escalated" ? "Waiting for KACHI's decision." : "Not escalated."}
              />
            </div>
          </Section>
        </div>

        <div className="grid h-fit gap-6">
          <Section title="Order">
            <DetailList
              className="sm:grid-cols-1"
              items={[
                {
                  label: "Order",
                  value: (
                    <Link href={`/orders/${ret.order.id}`} className="text-secondary hover:underline">
                      {ret.order.number}
                    </Link>
                  ),
                },
                { label: "Store's order", value: `${ret.store_order.store_name} · #${ret.store_order.number}` },
                {
                  label: "Buyer",
                  value:
                    ret.buyer && can("customers.view") ? (
                      <Link href={`/buyers/${ret.buyer.id}`} className="text-secondary hover:underline">
                        {ret.buyer.name}
                      </Link>
                    ) : (
                      (ret.buyer?.name ?? "—")
                    ),
                },
                { label: "Email", value: ret.buyer?.email ?? "—" },
              ]}
            />
          </Section>

          <Section title="Pickup">
            {pickup ? (
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Waybill", value: <span className="font-mono">{pickup.waybill_number}</span> },
                  { label: "Booked", value: formatDateTime(pickup.booked_at) },
                  {
                    label: "Courier status",
                    value: pickup.courier_status ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={pickup.courier_status} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(pickup.courier_status_at)}</span>
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  ...(pickup.cancelled_at ? [{ label: "Cancelled", value: formatDateTime(pickup.cancelled_at) }] : []),
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {ret.status === "approved" ? "The courier's pickup is not booked yet." : "Booked once the return is approved."}
              </p>
            )}
          </Section>

          <Section title="Timeline">
            <DetailList
              className="sm:grid-cols-1"
              items={[
                { label: "Requested", value: formatDateTime(ret.created_at) },
                ...(ret.escalated_at ? [{ label: "Escalated", value: formatDateTime(ret.escalated_at) }] : []),
                ...(ret.dispute_by ? [{ label: "Buyer may dispute until", value: formatDateTime(ret.dispute_by) }] : []),
                ...(ret.received_at
                  ? [
                      { label: "Received", value: formatDateTime(ret.received_at) },
                      { label: "Back on sale", value: ret.restocked ? "Yes" : "No" },
                    ]
                  : []),
                ...(ret.withdrawn_at ? [{ label: "Withdrawn by the buyer", value: formatDateTime(ret.withdrawn_at) }] : []),
              ]}
            />
          </Section>
        </div>
      </div>

      <ReasonDialog
        open={deciding !== null}
        onOpenChange={(open) => !open && setDeciding(null)}
        title={deciding === "approved" ? `Approve return ${ret.number}?` : `Reject return ${ret.number}?`}
        description={
          deciding === "approved"
            ? "The courier collects the items, and the buyer is refunded once they are back. The decision is final."
            : "The buyer keeps the items and is not refunded. The decision is final."
        }
        confirmLabel={deciding === "approved" ? "Approve" : "Reject"}
        destructive={deciding === "rejected"}
        required
        min={1}
        max={500}
        label="Remarks for the buyer and the store"
        onSubmit={async (remarks) => {
          if (!deciding || !remarks) return;
          onChange(await decideReturn(ret.id, deciding, remarks));
          toast.success("Return decided.");
        }}
      />

      <RestockDialog
        open={receiving}
        onOpenChange={setReceiving}
        title="Items received back?"
        description={`Confirms the items are back with the ${ret.store_order.store_name} store or the provider. The buyer is refunded ${formatMoney(ret.refund_amount)}.`}
        confirmLabel="Confirm received"
        onSubmit={async (restock) => {
          onChange(await receiveReturn(ret.id, restock));
          toast.success("Return received.");
        }}
      />

      <CourierUpdateDialog
        target={
          updating && pickup
            ? {
                waybill: pickup.waybill_number,
                courierStatus: pickup.courier_status,
                description: "Moves the return's pickup on its way back to the store.",
              }
            : null
        }
        onOpenChange={(open) => !open && setUpdating(false)}
        onSubmit={async (status, reason) => {
          onChange(await sendReturnCourierUpdate(ret.id, status, reason));
          toast.success("Courier update recorded.");
        }}
      />
    </>
  );
}

function Answer({ title, answer, by, empty }: { title: string; answer: ReturnAnswer | null; by?: string | null; empty: string }) {
  return (
    <div className="grid gap-1.5 text-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      {answer ? (
        <>
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={answer.decision} />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(answer.decided_at)}
              {by ? ` · ${by}` : ""}
            </span>
          </span>
          {answer.remarks && <p className="whitespace-pre-line">{answer.remarks}</p>}
        </>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

/** A buyer's photo: private, so it is downloaded with the token and shown through an object URL. */
function ReturnPhoto({ returnId, number }: { returnId: string; number: number }) {
  const { data: url, error } = useApi(`return-photo:${returnId}:${number}`, async () =>
    URL.createObjectURL(await getReturnPhoto(returnId, number)),
  );
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const frame = "flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5";
  if (error) {
    return (
      <span className={frame} title="Could not load this photo">
        <ImageOffIcon className="size-5 text-muted-foreground" />
      </span>
    );
  }
  if (!url) {
    return (
      <span className={frame}>
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element -- an object URL of a private photo */}
      <img src={url} alt={`Buyer's photo ${number}`} className="size-full object-cover" />
    </a>
  );
}
