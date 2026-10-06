"use client";

import Link from "next/link";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { deleteVoucher, listVouchers } from "@/lib/api/vouchers";
import { formatUaeDate } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Voucher } from "@/types/api";

export function voucherDiscount(voucher: Voucher): string {
  return voucher.type === "percentage"
    ? `${Number(voucher.value)}%${voucher.max_discount ? ` (max AED ${voucher.max_discount})` : ""}`
    : `AED ${voucher.value}`;
}

export function VouchersList() {
  const can = useCan();
  const allowed = can("promotions.view");
  const canManage = can("promotions.manage");
  const query = useQueryState();
  const q = query.get("q");
  const { data, error, loading, reload } = useApi(allowed ? `vouchers?${query.key}` : null, () =>
    listVouchers({ q, page: query.page }),
  );
  const [toDelete, setToDelete] = useState<Voucher | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="KACHI-funded vouchers work in every store; store vouchers only on that store's items."
        actions={
          canManage && (
            <ButtonLink href="/vouchers/new" variant="default">
              <PlusIcon /> New voucher
            </ButtonLink>
          )
        }
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No vouchers found" }}
        filters={<SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Code or name" />}
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Funded by</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min spend</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>
                    <Link href={`/vouchers/${voucher.id}`} className="font-mono font-medium hover:underline">
                      {voucher.code}
                    </Link>
                    <span className="block max-w-56 truncate text-xs text-muted-foreground">{voucher.name}</span>
                  </TableCell>
                  <TableCell>{voucher.funded_by === "kachi" ? "KACHI" : (voucher.store?.name ?? "Vendor")}</TableCell>
                  <TableCell>{voucherDiscount(voucher)}</TableCell>
                  <TableCell>{voucher.min_spend === "0.00" ? "—" : `AED ${voucher.min_spend}`}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatUaeDate(voucher.starts_at)} – {formatUaeDate(voucher.ends_at)}
                  </TableCell>
                  <TableCell>
                    {voucher.uses ?? 0}
                    {voucher.usage_limit ? ` / ${voucher.usage_limit}` : ""}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={voucher.status} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(voucher)} aria-label={`Delete ${voucher.code}`}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.code ?? "voucher"}?`}
        description="Buyers can no longer use the code. Orders that already used it keep their discount."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteVoucher(toDelete.id), "Voucher deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}
