"use client";

import Link from "next/link";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { getCodRemittance } from "@/lib/api/finance";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useCan } from "@/store/auth";

/** One transfer of cash-on-delivery money from Zajel, with the packages it covers. */
export function RemittanceDetail({ id }: { id: string }) {
  const can = useCan();
  const allowed = can("payments.view");
  const { data, error, loading, reload } = useApi(allowed ? `cod-remittance:${id}` : null, () => getCodRemittance(id));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(remittance) => (
        <>
          <PageHeader
            back={{ href: "/cash-on-delivery?tab=remittances", label: "Cash on delivery" }}
            title={`Transfer ${remittance.reference}`}
            description={`From Zajel, ${formatDateTime(remittance.remitted_at)}`}
          />
          <div className="grid gap-6">
            <Section title="Amounts">
              <DetailList
                className="lg:grid-cols-4"
                items={[
                  { label: "Collected by its packages", value: formatMoney(remittance.collected_total) },
                  { label: "Received by KACHI", value: formatMoney(remittance.amount) },
                  { label: "Kept by Zajel (fee)", value: formatMoney(remittance.fee) },
                  { label: "Recorded", value: formatDateTime(remittance.created_at) },
                  ...(remittance.note ? [{ label: "Note", value: remittance.note, wide: true }] : []),
                ]}
              />
            </Section>
            <Section title={`Packages (${remittance.packages?.length ?? 0})`} flush>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Collected</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Waybill</TableHead>
                    <TableHead className="pr-5 text-right">Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(remittance.packages ?? []).map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{formatDateTime(pkg.collected_at)}</TableCell>
                      <TableCell>
                        <Link href={`/orders?q=${encodeURIComponent(pkg.order_number)}`} className="font-medium hover:underline">
                          {pkg.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{pkg.waybill_number ?? "—"}</TableCell>
                      <TableCell className="pr-5 text-right">{formatMoney(pkg.cod_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </div>
        </>
      )}
    </AsyncContent>
  );
}
