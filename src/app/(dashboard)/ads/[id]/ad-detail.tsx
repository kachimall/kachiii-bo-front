"use client";

import Link from "next/link";
import { CheckIcon, OctagonXIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { approveAd, getAd, rejectAd, stopAd } from "@/lib/api/ads";
import { errorMessage } from "@/lib/api/client";
import { formatCount, formatDateTime, formatMoney, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { Ad } from "@/types/api";
import { AD_STATUS_LABELS, AD_STATUS_TONES } from "../ad-status";

export function AdDetail({ id }: { id: string }) {
  const can = useCan();
  const allowed = can("ads.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? `ad:${id}` : null, () => getAd(id));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(ad) => <AdView ad={ad} canManage={can("ads.manage")} onChange={mutate} />}
    </AsyncContent>
  );
}

function AdView({ ad, canManage, onChange }: { ad: Ad; canManage: boolean; onChange: (ad: Ad) => void }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const clickRate = ad.views > 0 ? `${((ad.clicks / ad.views) * 100).toFixed(1)}%` : "—";

  return (
    <>
      <PageHeader
        back={{ href: "/ads", label: "Ads" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Ad {ad.number}
            <StatusBadge status={ad.status} label={AD_STATUS_LABELS[ad.status]} tone={AD_STATUS_TONES[ad.status]} />
          </span>
        }
        description={`Booked ${formatDateTime(ad.created_at)} by ${ad.store.name}`}
        actions={
          canManage && (
            <>
              {ad.status === "pending_approval" && (
                <>
                  <Button variant="outline" onClick={() => setRejecting(true)}>
                    <XIcon /> Reject
                  </Button>
                  <Button onClick={() => setApproving(true)}>
                    <CheckIcon /> Approve
                  </Button>
                </>
              )}
              {(ad.status === "approved" || ad.status === "live") && (
                <Button variant="destructive" onClick={() => setStopping(true)}>
                  <OctagonXIcon /> Stop ad
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid h-fit gap-6">
          <Section title="Booking">
            <DetailList
              items={[
                { label: "Store", value: ad.store.name },
                {
                  label: "Advertises",
                  value: ad.product ? (
                    <Link href={`/products/${ad.product.id}`} className="text-secondary hover:underline">
                      {ad.product.name}
                    </Link>
                  ) : (
                    "The whole store"
                  ),
                },
                { label: "Placement", value: ad.placement.name },
                { label: "Length", value: `${ad.weeks} ${ad.weeks === 1 ? "week" : "weeks"}` },
                { label: "Price", value: formatMoney(ad.amount, ad.currency_code) },
                { label: "Runs", value: ad.starts_at ? `${formatDateTime(ad.starts_at)} – ${formatDateTime(ad.ends_at)}` : "Once paid" },
              ]}
            />
          </Section>

          <Section title="Timeline">
            <DetailList
              items={[
                { label: "Booked", value: formatDateTime(ad.created_at) },
                { label: "Approved", value: formatDateTime(ad.approved_at) },
                ...(ad.pay_by && !ad.paid_at ? [{ label: "Store pays by", value: formatDateTime(ad.pay_by) }] : []),
                { label: "Paid", value: formatDateTime(ad.paid_at) },
                ...(ad.rejected_at
                  ? [
                      { label: "Rejected", value: formatDateTime(ad.rejected_at) },
                      { label: "Reason for rejecting", value: ad.rejection_reason ?? "—", wide: true },
                    ]
                  : []),
                ...(ad.cancelled_at ? [{ label: "Cancelled by the store", value: formatDateTime(ad.cancelled_at) }] : []),
                ...(ad.stopped_at
                  ? [
                      { label: "Stopped", value: formatDateTime(ad.stopped_at) },
                      { label: "Reason for stopping", value: ad.stop_reason ?? "—", wide: true },
                    ]
                  : []),
                ...(ad.ended_at ? [{ label: "Ended", value: formatDateTime(ad.ended_at) }] : []),
              ]}
            />
          </Section>
        </div>

        <div className="grid h-fit gap-6">
          <Section title="Performance">
            <DetailList
              className="sm:grid-cols-1"
              items={[
                { label: "Views", value: formatCount(ad.views) },
                { label: "Clicks", value: formatCount(ad.clicks) },
                { label: "Click rate", value: clickRate },
              ]}
            />
          </Section>
          <Section title="Payment">
            {ad.payment ? (
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Latest attempt", value: <StatusBadge status={ad.payment.status} /> },
                  ...(ad.payment.failure_reason ? [{ label: "Why it failed", value: ad.payment.failure_reason }] : []),
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {ad.status === "approved" ? "The store has not tried to pay yet." : `No payment (${humanize(ad.status).toLowerCase()}).`}
              </p>
            )}
            {(ad.status === "live" || ad.status === "approved") && ad.paid_at && (
              <p className="mt-3 text-xs text-muted-foreground">Stopping a paid ad does not refund the store automatically.</p>
            )}
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title="Approve this ad?"
        description="The store is emailed and has 7 days to pay. The ad then runs and ends by itself."
        confirmLabel="Approve"
        onConfirm={async () => {
          try {
            onChange(await approveAd(ad.id));
            toast.success("Ad approved.");
            return true;
          } catch (error) {
            toast.error(errorMessage(error));
            return false;
          }
        }}
      />
      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Reject this ad"
        description="The store is emailed your reason."
        confirmLabel="Reject ad"
        destructive
        required
        min={3}
        max={500}
        onSubmit={async (reason) => {
          onChange(await rejectAd(ad.id, reason ?? ""));
          toast.success("Ad rejected.");
        }}
      />
      <ReasonDialog
        open={stopping}
        onOpenChange={setStopping}
        title="Stop this ad"
        description={`It stops showing at once, and the store is emailed your reason.${ad.paid_at ? " A paid ad is not refunded automatically." : ""}`}
        confirmLabel="Stop ad"
        destructive
        required
        min={3}
        max={500}
        onSubmit={async (reason) => {
          onChange(await stopAd(ad.id, reason ?? ""));
          toast.success("Ad stopped.");
        }}
      />
    </>
  );
}
