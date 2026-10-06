"use client";

import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, EmptyState, ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useCategoryOptions } from "@/hooks/use-options";
import { getCommissionRates, setCategoryCommission, setDefaultCommission, setVendorCommission } from "@/lib/api/finance";
import { listVendors } from "@/lib/api/vendors";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { CommissionRates } from "@/types/api";
import { RateDialog, type RateDialogState } from "./rate-dialog";

type Target = { kind: "default" } | { kind: "category" | "vendor"; id?: string; name?: string };

export function CommissionRatesPage() {
  const can = useCan();
  const allowed = can("commissions.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? "commission-rates" : null, getCommissionRates);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Commission"
        description="KACHI's commission on each order line. A vendor's own rate wins over its category's, a category's over the default. Orders keep the rate they were placed at."
      />
      <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
        {(rates) => <RatesView rates={rates} canManage={can("commissions.manage")} onChange={mutate} />}
      </AsyncContent>
    </>
  );
}

function RatesView({ rates, canManage, onChange }: { rates: CommissionRates; canManage: boolean; onChange: (rates: CommissionRates) => void }) {
  const can = useCan();
  const [editing, setEditing] = useState<{ target: Target; dialog: RateDialogState } | null>(null);
  const [removing, setRemoving] = useState<{ kind: "category" | "vendor"; id: string; name: string } | null>(null);
  const categoryOptions = useCategoryOptions(canManage);
  // Up to 100 approved vendors (the API's page limit) for the picker.
  const { data: vendors } = useApi(canManage ? "options:vendors:approved" : null, () => listVendors({ status: "approved", per_page: 100 }));
  const vendorOptions = vendors?.data.map((v) => ({ value: v.id, label: v.store ? `${v.business_name} · ${v.store.name}` : v.business_name })) ?? [];

  async function save(target: Target, rate: string | null, picked?: string) {
    if (target.kind === "default") onChange(await setDefaultCommission(rate ?? "0"));
    else if (target.kind === "category") onChange(await setCategoryCommission(target.id ?? picked!, rate));
    else onChange(await setVendorCommission(target.id ?? picked!, rate));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Section
        title="Default rate"
        className="h-fit"
        actions={
          canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditing({
                  target: { kind: "default" },
                  dialog: {
                    title: "Change the default rate",
                    description: "For lines whose vendor and category have no rate of their own. New orders only.",
                    rate: rates.default,
                  },
                })
              }
            >
              <PencilIcon /> Change
            </Button>
          )
        }
      >
        <p className="font-heading text-headline-lg">{Number(rates.default)}%</p>
        <p className="mt-1 text-sm text-muted-foreground">For lines whose vendor and category have no rate of their own.</p>
      </Section>

      <div className="grid gap-6 lg:col-span-2">
        <Section
          title="Category rates"
          flush
          actions={
            canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditing({
                    target: { kind: "category" },
                    dialog: {
                      title: "Add a category rate",
                      description: "Applies to the category and its subcategories without a rate of their own.",
                      rate: "",
                      options: categoryOptions,
                      optionLabel: "Category",
                    },
                  })
                }
              >
                <PlusIcon /> Add
              </Button>
            )
          }
        >
          {rates.categories.length === 0 ? (
            <EmptyState title="No category rates" description="Every category uses the default rate." />
          ) : (
            <RateTable
              rows={rates.categories.map((c) => ({ id: c.id, name: c.name, rate: c.rate }))}
              canManage={canManage}
              onEdit={(row) =>
                setEditing({
                  target: { kind: "category", id: row.id, name: row.name },
                  dialog: { title: `Rate for ${row.name}`, description: "Leave it empty to follow the parent category's rate or the default.", rate: row.rate, removable: true },
                })
              }
              onRemove={(row) => setRemoving({ kind: "category", id: row.id, name: row.name })}
            />
          )}
        </Section>

        <Section
          title="Vendor rates"
          flush
          actions={
            canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditing({
                    target: { kind: "vendor" },
                    dialog: {
                      title: "Add a vendor rate",
                      description: "Applies to all the vendor's products, whatever their category.",
                      rate: "",
                      options: vendorOptions,
                      optionLabel: "Vendor",
                    },
                  })
                }
              >
                <PlusIcon /> Add
              </Button>
            )
          }
        >
          {rates.vendors.length === 0 ? (
            <EmptyState title="No vendor rates" description="Every vendor follows its categories' rates." />
          ) : (
            <RateTable
              rows={rates.vendors.map((v) => ({
                id: v.id,
                name: v.business_name,
                detail: v.store,
                href: can("vendors.view") ? `/vendors/${v.id}` : undefined,
                rate: v.rate,
              }))}
              canManage={canManage}
              onEdit={(row) =>
                setEditing({
                  target: { kind: "vendor", id: row.id, name: row.name },
                  dialog: { title: `Rate for ${row.name}`, description: "Leave it empty to follow the category rates.", rate: row.rate, removable: true },
                })
              }
              onRemove={(row) => setRemoving({ kind: "vendor", id: row.id, name: row.name })}
            />
          )}
        </Section>
      </div>

      <RateDialog
        state={editing?.dialog ?? null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (rate, picked) => {
          if (!editing) return;
          await save(editing.target, rate, picked);
          toast.success("Commission rates updated.");
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this"}'s rate?`}
        description={
          removing?.kind === "category"
            ? "The category follows its parent's rate or the default again. Orders already placed keep their rate."
            : "The vendor's products follow their categories' rates again. Orders already placed keep their rate."
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => runAction(async () => removing && save(removing, null), "Commission rate removed.")}
      />
    </div>
  );
}

interface RateRow {
  id: string;
  name: string;
  detail?: string | null;
  href?: string;
  rate: string;
}

function RateTable({
  rows,
  canManage,
  onEdit,
  onRemove,
}: {
  rows: RateRow[];
  canManage: boolean;
  onEdit: (row: RateRow) => void;
  onRemove: (row: RateRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Name</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          {canManage && <TableHead className="pr-5" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="pl-5">
              {row.href ? (
                <Link href={row.href} className="block font-medium hover:underline">
                  {row.name}
                </Link>
              ) : (
                <span className="block font-medium">{row.name}</span>
              )}
              {row.detail && <span className="block text-xs text-muted-foreground">{row.detail}</span>}
            </TableCell>
            <TableCell className="text-right font-medium">{Number(row.rate)}%</TableCell>
            {canManage && (
              <TableCell className="pr-5 text-right">
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(row)} aria-label={`Edit ${row.name}'s rate`}>
                  <PencilIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onRemove(row)} aria-label={`Remove ${row.name}'s rate`}>
                  <Trash2Icon />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
