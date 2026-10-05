"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { deleteBrand, listBrands } from "@/lib/api/catalog";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Brand } from "@/types/api";
import { BrandDialog } from "./brand-dialog";

export function BrandsList() {
  const can = useCan();
  const allowed = can("products.view");
  const canManage = can("brands.manage");
  const query = useQueryState();
  const q = query.get("q");
  const active = query.get("is_active");
  const { data, error, loading, reload } = useApi(allowed ? `brands?${query.key}` : null, () =>
    listBrands({ q, is_active: active === "" ? undefined : active === "1", page: query.page }),
  );
  const [editing, setEditing] = useState<Brand | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Brand | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Brands"
        description="Brands vendors can attach to their products."
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon /> New brand
            </Button>
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
        empty={{ title: "No brands found" }}
        filters={
          <>
            <SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Search brands" />
            <FilterSelect
              label="Statuses"
              value={active}
              onChange={(value) => query.set({ is_active: value })}
              options={[
                { value: "1", label: "Active" },
                { value: "0", label: "Inactive" },
              ]}
            />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Thumb src={brand.logo_url} alt="" />
                      <span className="font-medium">{brand.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                  <TableCell>
                    <StatusBadge status={brand.is_active === false ? "inactive" : "active"} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(brand)} aria-label={`Edit ${brand.name}`}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(brand)} aria-label={`Delete ${brand.name}`}>
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

      <BrandDialog brand={editing} onClose={() => setEditing(undefined)} onSaved={reload} onLogoChange={setEditing} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "brand"}?`}
        description="A brand that products still use cannot be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteBrand(toDelete.id), "Brand deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}
