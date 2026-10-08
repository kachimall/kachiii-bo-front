"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listCodOutstanding, listCodRemittances } from "@/lib/api/finance";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { CodPackage } from "@/types/api";
import { RemittanceDialog } from "./remittance-dialog";

type Tab = "outstanding" | "remittances";

/**
 * Cash-on-delivery money (DECISIONS FN8): the cash Zajel collected and still holds, and each
 * transfer it makes to KACHI. Staff with payments.manage record a transfer against the packages
 * it covers; what Zajel kept is its fee.
 */
export function CodView() {
  const can = useCan();
  const allowed = can("payments.view");
  const canManage = can("payments.manage");
  const query = useQueryState();
  const tab: Tab = query.get("tab") === "remittances" ? "remittances" : "outstanding";

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Cash on delivery"
        description="Cash Zajel collected at the door and still holds, and the transfers it has made to KACHI."
        actions={
          <ButtonLink href="/refunds?payment_method=cash_on_delivery&status=pending" variant="outline">
            Cash refunds owed
          </ButtonLink>
        }
      />
      <Tabs value={tab} onValueChange={(value) => query.set({ tab: value === "outstanding" ? null : value })} className="mb-4">
        <TabsList>
          <TabsTrigger value="outstanding">Held by Zajel</TabsTrigger>
          <TabsTrigger value="remittances">Transfers</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "outstanding" ? <Outstanding canManage={canManage} /> : <Remittances page={query.page} onPage={(page) => query.set({ page })} />}
    </>
  );
}

function Outstanding({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(`cod-outstanding:${page}`, () => listCodOutstanding({ page, per_page: 100 }));
  // Kept across pages: a transfer can cover packages on several.
  const [selected, setSelected] = useState<Map<string, CodPackage>>(new Map());
  const [recording, setRecording] = useState(false);

  function toggle(pkg: CodPackage, on: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      if (on) next.set(pkg.id, pkg);
      else next.delete(pkg.id);
      return next;
    });
  }

  const rows = data?.data;
  const allOnPage = Boolean(rows && rows.length > 0 && rows.every((pkg) => selected.has(pkg.id)));
  const selectedTotal = [...selected.values()].reduce((sum, pkg) => sum + Math.round(Number(pkg.cod_amount) * 100), 0);

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Zajel holds</p>
          <p className="font-heading text-headline-md">{formatMoney(data?.meta.outstanding_amount ?? null)}</p>
          <p className="text-xs text-muted-foreground">
            {data?.meta.total !== undefined ? `${data.meta.total} ${data.meta.total === 1 ? "package" : "packages"} collected, not transferred yet` : " "}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-col justify-between gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              {selected.size === 0
                ? "Tick the packages a transfer from Zajel covers, then record it."
                : `${selected.size} selected, ${formatMoney((selectedTotal / 100).toFixed(2))} collected`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={selected.size === 0} onClick={() => setRecording(true)}>
                <PlusIcon /> Record transfer
              </Button>
              {selected.size > 0 && (
                <Button variant="ghost" onClick={() => setSelected(new Map())}>
                  Clear selection
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <ListPanel
        rows={rows}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={setPage}
        empty={{ title: "Zajel holds no cash", description: "Every collected package has been transferred." }}
      >
        {(list) => (
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all on this page"
                      checked={allOnPage}
                      onCheckedChange={(checked) => list.forEach((pkg) => toggle(pkg, checked === true))}
                    />
                  </TableHead>
                )}
                <TableHead>Collected</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Waybill</TableHead>
                <TableHead className="text-right">Cash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((pkg) => (
                <TableRow key={pkg.id}>
                  {canManage && (
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${pkg.waybill_number ?? pkg.order_number}`}
                        checked={selected.has(pkg.id)}
                        onCheckedChange={(checked) => toggle(pkg, checked === true)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(pkg.collected_at)}</TableCell>
                  <TableCell>
                    <Link href={`/orders?q=${encodeURIComponent(pkg.order_number)}`} className="font-medium hover:underline">
                      {pkg.order_number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pkg.waybill_number ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(pkg.cod_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <RemittanceDialog
        open={recording}
        onOpenChange={setRecording}
        packages={[...selected.values()]}
        onRecorded={() => {
          setSelected(new Map());
          setPage(1);
          reload();
        }}
      />
    </>
  );
}

function Remittances({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const { data, error, loading, reload } = useApi(`cod-remittances:${page}`, () => listCodRemittances({ page }));
  return (
    <ListPanel
      rows={data?.data}
      meta={data?.meta}
      loading={loading}
      error={error}
      onRetry={reload}
      onPage={onPage}
      empty={{ title: "No transfers recorded", description: "Record one from the cash Zajel holds." }}
    >
      {(rows) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transferred</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Zajel fee</TableHead>
              <TableHead className="text-right">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((remittance) => (
              <TableRow key={remittance.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(remittance.remitted_at)}</TableCell>
                <TableCell>
                  <Link href={`/cash-on-delivery/remittances/${remittance.id}`} className="font-mono text-sm font-medium hover:underline">
                    {remittance.reference}
                  </Link>
                  {remittance.note && <span className="block max-w-64 truncate text-xs text-muted-foreground">{remittance.note}</span>}
                </TableCell>
                <TableCell className="text-right">{formatMoney(remittance.collected_total)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatMoney(remittance.fee)}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(remittance.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ListPanel>
  );
}
