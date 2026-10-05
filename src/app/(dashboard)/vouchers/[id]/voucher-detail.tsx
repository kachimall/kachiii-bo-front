"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { AsyncContent } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { deleteVoucher, getVoucher } from "@/lib/api/vouchers";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import { VoucherForm } from "../voucher-form";
import { voucherDiscount } from "../vouchers-list";

export function VoucherDetail({ id }: { id: string }) {
  const router = useRouter();
  const can = useCan();
  const { data, error, loading, reload, mutate } = useApi(`voucher:${id}`, () => getVoucher(id));
  const [deleting, setDeleting] = useState(false);

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(voucher) => (
        <>
          <PageHeader
            back={{ href: "/vouchers", label: "Vouchers" }}
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span className="font-mono">{voucher.code}</span> <StatusBadge status={voucher.status} />
              </span>
            }
            description={`${voucher.name} · ${voucherDiscount(voucher)} · used ${voucher.uses ?? 0} time${voucher.uses === 1 ? "" : "s"}`}
            actions={
              can("promotions.manage") && (
                <Button variant="destructive" onClick={() => setDeleting(true)}>
                  Delete
                </Button>
              )
            }
          />
          <VoucherForm key={voucher.id} voucher={voucher} onSaved={mutate} />
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Delete ${voucher.code}?`}
            description="Buyers can no longer use the code. Orders that already used it keep their discount."
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              const ok = await runAction(() => deleteVoucher(voucher.id), "Voucher deleted.");
              if (ok) router.replace("/vouchers");
              return ok;
            }}
          />
        </>
      )}
    </AsyncContent>
  );
}
