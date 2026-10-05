"use client";

import Link from "next/link";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listVendors } from "@/lib/api/vendors";
import { formatDate, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";

export const VENDOR_STATUSES = ["pending", "awaiting_consent", "approved", "rejected", "suspended", "terminated"] as const;

export function VendorsList() {
  const can = useCan();
  const allowed = can("vendors.view");
  const query = useQueryState();
  const q = query.get("q");
  const status = query.get("status");
  const { data, error, loading, reload } = useApi(allowed ? `vendors?${query.key}` : null, () =>
    listVendors({ q, status, page: query.page }),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader title="Vendors" description="Vendor applications and accounts." />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No vendors found" }}
        filters={
          <>
            <SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Business, store or email" />
            <FilterSelect label="Statuses" value={status} onChange={(value) => query.set({ status: value })} options={VENDOR_STATUSES} />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <Link href={`/vendors/${vendor.id}`} className="font-medium hover:underline">
                      {vendor.business_name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {[vendor.code, humanize(vendor.business_type)].filter(Boolean).join(" · ")}
                    </span>
                  </TableCell>
                  <TableCell>{vendor.store?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span className="block">{vendor.contact_email ?? vendor.user?.email ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">{vendor.contact_phone}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={vendor.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(vendor.submitted_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
