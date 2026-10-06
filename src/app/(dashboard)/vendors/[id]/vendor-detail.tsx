"use client";

import Link from "next/link";
import { EyeIcon, FileTextIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Section } from "@/components/common/section";
import { AsyncContent } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { ApiError, errorMessage } from "@/lib/api/client";
import { getCommissionRates, setVendorCommission } from "@/lib/api/finance";
import {
  getVendor,
  openConsentCopy,
  openVendorDocument,
  resendAgreementLink,
  revealTaxId,
  setVendorStatus,
  type VendorStatusInput,
} from "@/lib/api/vendors";
import { formatBytes, formatDateTime, humanize } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Vendor } from "@/types/api";
import { RateDialog } from "../../commission-rates/rate-dialog";
import { VendorEarnings } from "./vendor-earnings";

interface StatusAction {
  to: VendorStatusInput["status"];
  label: string;
  permission: "vendors.approve" | "vendors.manage";
  destructive?: boolean;
  reasonRequired: boolean;
  description: string;
}

/**
 * What staff may do from each status (VendorStatus::canTransitionTo, VendorPolicy::changeStatus):
 * deciding an application needs vendors.approve; suspending, terminating and reinstating need
 * vendors.manage. Approving a pending application moves it to awaiting_consent.
 */
function actionsFor(vendor: Vendor): StatusAction[] {
  const reject: StatusAction = { to: "rejected", label: "Reject", permission: "vendors.approve", destructive: true, reasonRequired: true, description: "The applicant sees the reason and can edit and resubmit the application." };
  const suspend: StatusAction = { to: "suspended", label: "Suspend", permission: "vendors.manage", destructive: true, reasonRequired: true, description: "The store goes offline. The vendor keeps read-only access to their back office." };
  const terminate: StatusAction = { to: "terminated", label: "Terminate", permission: "vendors.manage", destructive: true, reasonRequired: true, description: "The vendor loses access and the store goes offline." };
  const reinstate: StatusAction = { to: "approved", label: "Reinstate", permission: "vendors.manage", reasonRequired: false, description: "The vendor and their store become active again." };

  switch (vendor.status) {
    case "pending":
      return [reject];
    case "awaiting_consent":
      return [reject];
    case "approved":
      return [suspend, terminate];
    case "suspended":
      return [reinstate, terminate];
    case "terminated":
      return [reinstate];
    default:
      return [];
  }
}

export function VendorDetail({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi(`vendor:${id}`, () => getVendor(id));
  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(vendor) => <VendorView vendor={vendor} onChange={mutate} onReload={reload} />}
    </AsyncContent>
  );
}

function VendorView({ vendor, onChange, onReload }: { vendor: Vendor; onChange: (v: Vendor) => void; onReload: () => void }) {
  const can = useCan();
  const canApprove = can("vendors.approve");
  const [action, setAction] = useState<StatusAction | null>(null);
  const [approving, setApproving] = useState(false);
  const [resending, setResending] = useState(false);
  const [taxId, setTaxId] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const actions = actionsFor(vendor).filter((a) => can(a.permission));
  const consent = vendor.consent;

  async function changeStatus(reason: string | null) {
    if (!action) return;
    onChange(await setVendorStatus(vendor.id, { status: action.to, reason }));
    const done = { approved: "reinstated", rejected: "rejected", suspended: "suspended", terminated: "terminated" }[action.to];
    toast.success(`Vendor ${done}.`);
  }

  async function approve(): Promise<boolean> {
    try {
      // The revision we reviewed: the API refuses (409) if the applicant edited since.
      onChange(await setVendorStatus(vendor.id, { status: "approved", revision: vendor.revision }));
      toast.success("Application approved. The vendor was sent the agreement to accept.");
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      if (error instanceof ApiError && error.status === 409) onReload();
      return false;
    }
  }

  async function reveal() {
    setRevealing(true);
    try {
      const result = await revealTaxId(vendor.id);
      setTaxId(result.tax_id ?? "Not provided");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevealing(false);
    }
  }

  async function openDocument(open: () => Promise<void>) {
    try {
      await open();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/vendors", label: "Vendors" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {vendor.business_name} <StatusBadge status={vendor.status} />
          </span>
        }
        description={[vendor.code, humanize(vendor.business_type), `revision ${vendor.revision}`].filter(Boolean).join(" · ")}
        actions={
          <>
            {vendor.status === "awaiting_consent" && canApprove && (
              <Button
                variant="outline"
                disabled={resending}
                onClick={async () => {
                  setResending(true);
                  await runAction(async () => onChange(await resendAgreementLink(vendor.id)), "A new agreement link was sent to the vendor.");
                  setResending(false);
                }}
              >
                {resending && <Loader2Icon className="animate-spin" />}
                Resend agreement link
              </Button>
            )}
            {vendor.status === "pending" && canApprove && <Button onClick={() => setApproving(true)}>Approve</Button>}
            {actions.map((a) => (
              <Button key={a.to} variant={a.destructive ? "destructive" : "default"} onClick={() => setAction(a)}>
                {a.label}
              </Button>
            ))}
          </>
        }
      />

      {vendor.status_reason && (
        <div className="mb-6 rounded-xl bg-muted p-4 text-sm">
          <span className="font-medium">Reason given:</span> {vendor.status_reason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Section title="Business">
            <DetailList
              items={[
                { label: "Business name", value: vendor.business_name },
                { label: "Business type", value: humanize(vendor.business_type) },
                {
                  label: "Tax ID (TRN)",
                  value: (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{taxId ?? vendor.tax_id ?? "—"}</span>
                      {canApprove && taxId === null && vendor.tax_id && (
                        <Button variant="outline" size="xs" onClick={reveal} disabled={revealing}>
                          {revealing ? <Loader2Icon className="animate-spin" /> : <EyeIcon />} Reveal
                        </Button>
                      )}
                    </span>
                  ),
                },
                { label: "VAT registered", value: vendor.is_vat_registered ? "Yes" : "No" },
                { label: "Contact email", value: vendor.contact_email ?? "—" },
                { label: "Contact phone", value: vendor.contact_phone },
                { label: "Submitted", value: formatDateTime(vendor.submitted_at) },
                { label: "Approved", value: formatDateTime(vendor.approved_at) },
                ...(vendor.agreement_link_expires_at
                  ? [{ label: "Agreement link expires", value: formatDateTime(vendor.agreement_link_expires_at) }]
                  : []),
              ]}
            />
            {canApprove && taxId === null && vendor.tax_id && (
              <p className="mt-4 text-xs text-muted-foreground">Revealing the tax ID is recorded in the activity log.</p>
            )}
          </Section>

          <Section title="Documents">
            {vendor.documents && vendor.documents.length > 0 ? (
              <ul className="divide-y">
                {vendor.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{humanize(doc.type)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.original_name} · {formatBytes(doc.size_bytes)} · {formatDateTime(doc.uploaded_at)}
                      </p>
                    </div>
                    {canApprove && (
                      <Button variant="outline" size="sm" onClick={() => openDocument(() => openVendorDocument(vendor.id, doc.id))}>
                        Open
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            )}
            {!canApprove && vendor.documents && vendor.documents.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">Opening documents needs the vendors.approve permission.</p>
            )}
          </Section>

          <Section title="Agreement">
            {consent ? (
              <>
                <DetailList
                  items={[
                    {
                      label: "Agreement",
                      value: consent.agreement ? `${consent.agreement.title} (v${consent.agreement.version})` : "—",
                    },
                    { label: "Accepted", value: formatDateTime(consent.accepted_at) },
                    {
                      label: "Accepted by",
                      value: consent.accepted_by ? `${consent.accepted_by.name} (${consent.accepted_by.email})` : "—",
                    },
                    { label: "IP address", value: consent.ip_address ?? "—" },
                    { label: "User agent", value: consent.user_agent ?? "—", wide: true },
                  ]}
                />
                <div className="mt-4">
                  {consent.copy_ready ? (
                    <Button variant="outline" size="sm" onClick={() => openDocument(() => openConsentCopy(vendor.id, vendor.consent!.id))}>
                      <FileTextIcon /> Signed copy
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">The signed copy is not ready yet.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {vendor.status === "awaiting_consent" ? "Waiting for the vendor to accept the agreement." : "Not accepted yet."}
              </p>
            )}
          </Section>
        </div>

        <div className="grid h-fit gap-6">
          <Section title="Store">
            {vendor.store ? (
              <div className="grid gap-4">
                <DetailList
                  className="sm:grid-cols-1"
                  items={[
                    { label: "Name", value: vendor.store.name },
                    { label: "Slug", value: vendor.store.slug },
                    { label: "Status", value: <StatusBadge status={vendor.store.status} /> },
                    ...(vendor.store.status_reason ? [{ label: "Status reason", value: vendor.store.status_reason }] : []),
                    { label: "Description", value: vendor.store.description ?? "—" },
                  ]}
                />
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link href={`/stores?q=${encodeURIComponent(vendor.store.name)}`} className="text-secondary hover:underline">
                    Manage store
                  </Link>
                  {can("products.view") && (
                    <Link href={`/products?vendor_id=${vendor.id}`} className="text-secondary hover:underline">
                      View products
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No store yet.</p>
            )}
          </Section>

          {vendor.user && (
            <Section title="Account holder">
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Name", value: vendor.user.name },
                  { label: "Email", value: vendor.user.email },
                  { label: "Account status", value: <StatusBadge status={vendor.user.status} /> },
                ]}
              />
            </Section>
          )}

          {can("commissions.view") && <VendorCommission vendor={vendor} canManage={can("commissions.manage")} />}
        </div>
      </div>

      {/* Only a vendor with a store can have sold anything. */}
      {can("payouts.view") && vendor.store && (
        <div className="mt-6">
          <VendorEarnings vendorId={vendor.id} />
        </div>
      )}

      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title={`Approve ${vendor.business_name}?`}
        description={`You are approving revision ${vendor.revision} of the application. The vendor is emailed the agreement; their store opens once they accept it.`}
        confirmLabel="Approve"
        onConfirm={approve}
      />
      <ReasonDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action ? `${action.label} ${vendor.business_name}?` : ""}
        description={action?.description}
        confirmLabel={action?.label ?? ""}
        destructive={action?.destructive}
        required={action?.reasonRequired ?? true}
        onSubmit={changeStatus}
      />
    </>
  );
}

/** The vendor's own commission rate, if any: the rates list only names vendors that have one. */
function VendorCommission({ vendor, canManage }: { vendor: Vendor; canManage: boolean }) {
  const { data, error, mutate } = useApi("commission-rates", getCommissionRates);
  const [editing, setEditing] = useState(false);
  const own = data?.vendors.find((v) => v.id === vendor.id)?.rate ?? null;

  return (
    <Section
      title="Commission"
      actions={
        canManage &&
        data && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon /> Change
          </Button>
        )
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground">Could not load the commission rates.</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : own !== null ? (
        <p className="text-sm">
          <span className="font-medium">{Number(own)}%</span> on all its products (its own rate).
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No rate of its own: its categories&apos; rates apply, else the default of {Number(data.default)}%.
        </p>
      )}
      <RateDialog
        state={
          editing
            ? {
                title: `Commission for ${vendor.business_name}`,
                description: "Applies to all the vendor's products, whatever their category. New orders only.",
                rate: own ?? "",
                removable: true,
              }
            : null
        }
        onOpenChange={setEditing}
        onSubmit={async (rate) => {
          mutate(await setVendorCommission(vendor.id, rate));
          toast.success(rate === null ? "The vendor's own rate was removed." : "Commission rate updated.");
        }}
      />
    </Section>
  );
}
