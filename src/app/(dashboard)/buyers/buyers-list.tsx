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
import { listBuyers } from "@/lib/api/buyers";
import { formatDate } from "@/lib/format";
import { useCan } from "@/store/auth";

export function BuyersList() {
  const can = useCan();
  const allowed = can("customers.view");
  const query = useQueryState();
  const q = query.get("q");
  const status = query.get("status");
  const { data, error, loading, reload } = useApi(allowed ? `buyers?${query.key}` : null, () =>
    listBuyers({ q, status, page: query.page }),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader title="Buyers" description="Shopper accounts. Vendor accounts are managed under Vendors." />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No buyers found" }}
        filters={
          <>
            <SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Name, email or phone" />
            <FilterSelect label="Statuses" value={status} onChange={(value) => query.set({ status: value })} options={["active", "suspended", "inactive"]} />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((buyer) => (
                <TableRow key={buyer.id}>
                  <TableCell>
                    <Link href={`/buyers/${buyer.id}`} className="font-medium hover:underline">
                      {buyer.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {buyer.email}
                    {!buyer.email_verified && <span className="ml-2 text-xs text-muted-foreground">(unverified)</span>}
                  </TableCell>
                  <TableCell>{buyer.phone ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={buyer.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(buyer.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
