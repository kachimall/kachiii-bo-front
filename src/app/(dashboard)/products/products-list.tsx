"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useBrandOptions, useCategoryOptions, useStoreOptions } from "@/hooks/use-options";
import { useQueryState } from "@/hooks/use-query-state";
import { listProducts } from "@/lib/api/products";
import { formatDate, formatPriceRange } from "@/lib/format";
import { useCan } from "@/store/auth";

export const PRODUCT_STATUSES = ["pending_review", "active", "inactive", "rejected", "banned", "draft", "archived"] as const;

export function ProductsList() {
  const can = useCan();
  const query = useQueryState();
  const filters = {
    status: query.get("status"),
    q: query.get("q"),
    category_id: query.get("category_id"),
    brand_id: query.get("brand_id"),
    store_id: query.get("store_id"),
    vendor_id: query.get("vendor_id"),
    page: query.page,
  };
  const allowed = can("products.view");
  const { data, error, loading, reload } = useApi(allowed ? `products?${query.key}` : null, () => listProducts(filters));
  const categories = useCategoryOptions(allowed);
  const brands = useBrandOptions(allowed);
  const stores = useStoreOptions(allowed && can("vendors.view"));

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Products"
        description="Every listing on the marketplace. Review new submissions and moderate listings."
        actions={
          <ButtonLink href="/inventory/low-stock">Low stock</ButtonLink>
        }
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No products found", description: "Try other filters." }}
        filters={
          <>
            <SearchInput value={filters.q} onChange={(q) => query.set({ q })} placeholder="Search name or SKU" />
            <FilterSelect label="Statuses" value={filters.status} onChange={(status) => query.set({ status })} options={PRODUCT_STATUSES} />
            <FilterSelect label="Categories" value={filters.category_id} onChange={(category_id) => query.set({ category_id })} options={categories} />
            <FilterSelect label="Brands" value={filters.brand_id} onChange={(brand_id) => query.set({ brand_id })} options={brands} />
            {stores.length > 0 && (
              <FilterSelect label="Stores" value={filters.store_id} onChange={(store_id) => query.set({ store_id })} options={stores} />
            )}
            {filters.vendor_id && (
              <Button variant="secondary" size="sm" onClick={() => query.set({ vendor_id: null })}>
                One vendor only <XIcon />
              </Button>
            )}
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/products/${product.id}`} className="flex items-center gap-3 hover:underline">
                      <Thumb src={product.thumbnail_url} alt="" />
                      <span className="min-w-0">
                        <span className="block max-w-xs truncate font-medium">{product.name}</span>
                        <span className="block text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{product.store.name}</TableCell>
                  <TableCell>{formatPriceRange(product.price_range, product.currency_code)}</TableCell>
                  <TableCell>
                    {product.in_stock ? (
                      (product.stock_on_hand ?? "In stock")
                    ) : (
                      <span className="text-destructive">Out of stock</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(product.submitted_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
