"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listLowStock } from "@/lib/api/products";
import { formatOptions } from "@/lib/format";
import { useCan } from "@/store/auth";

export function LowStockList() {
  const can = useCan();
  const query = useQueryState();
  const vendorId = query.get("vendor_id");
  const allowed = can("products.view");
  const { data, error, loading, reload } = useApi(allowed ? `low-stock?${query.key}` : null, () =>
    listLowStock({ vendor_id: vendorId, page: query.page }),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title="Low stock"
        description="Variants whose available stock is at or under their low-stock threshold."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "Nothing is running low", description: "Every variant is above its threshold." }}
        filters={
          vendorId ? (
            <Button variant="secondary" size="sm" onClick={() => query.set({ vendor_id: null })}>
              One vendor only <XIcon />
            </Button>
          ) : undefined
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.variant?.id ?? `${row.product?.id}-${row.on_hand}`}>
                  <TableCell>
                    {row.product ? (
                      <Link href={`/products/${row.product.id}`} className="font-medium hover:underline">
                        {row.product.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="block">{formatOptions(row.variant?.options)}</span>
                    <span className="block text-xs text-muted-foreground">{row.variant?.sku}</span>
                  </TableCell>
                  <TableCell>{row.on_hand}</TableCell>
                  <TableCell>{row.reserved}</TableCell>
                  <TableCell className={row.available <= 0 ? "font-medium text-destructive" : "font-medium"}>{row.available}</TableCell>
                  <TableCell>{row.low_stock_threshold}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.product?.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
