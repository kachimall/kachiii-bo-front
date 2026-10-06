"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listStores, setStoreStatus, updateStore } from "@/lib/api/vendors";
import { formatDate } from "@/lib/format";
import { handleFormError, nullable } from "@/lib/forms";
import { storeSchema, type StoreValues } from "@/lib/schemas/vendors";
import { useCan } from "@/store/auth";
import type { Store } from "@/types/api";

export function StoresList() {
  const can = useCan();
  const allowed = can("vendors.view");
  const canManage = can("stores.manage");
  const query = useQueryState();
  const q = query.get("q");
  const status = query.get("status");
  const vendorId = query.get("vendor_id");
  const { data, error, loading, reload } = useApi(allowed ? `stores?${query.key}` : null, () =>
    listStores({ q, status, vendor_id: vendorId, page: query.page }),
  );
  const [editing, setEditing] = useState<Store | null>(null);
  const [statusFor, setStatusFor] = useState<Store | null>(null);

  if (!allowed) return <ForbiddenState />;

  const suspending = statusFor?.status !== "suspended";

  return (
    <>
      <PageHeader title="Stores" description="Each vendor's storefront. Suspend a store to take it offline." />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No stores found" }}
        filters={
          <>
            <SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Store name or slug" />
            <FilterSelect label="Statuses" value={status} onChange={(value) => query.set({ status: value })} options={["active", "inactive", "suspended"]} />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Thumb src={store.logo_url} alt="" />
                      <span>
                        <span className="block font-medium">{store.name}</span>
                        <span className="block text-xs text-muted-foreground">/{store.slug}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {store.vendor ? (
                      <Link href={`/vendors/${store.vendor.id}`} className="hover:underline">
                        {store.vendor.business_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{store.products_count ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={store.status} />
                    {store.status_reason && (
                      <span className="mt-1 block max-w-48 truncate text-xs text-muted-foreground" title={store.status_reason}>
                        {store.status_reason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(store.joined_at)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(store)} aria-label={`Edit ${store.name}`}>
                        <PencilIcon />
                      </Button>
                      <Button variant={store.status === "suspended" ? "outline" : "destructive"} size="sm" onClick={() => setStatusFor(store)}>
                        {store.status === "suspended" ? "Reactivate" : "Suspend"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {editing && <StoreForm key={editing.id} store={editing} onDone={() => { setEditing(null); reload(); }} />}
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={statusFor !== null}
        onOpenChange={(open) => !open && setStatusFor(null)}
        title={suspending ? `Suspend ${statusFor?.name}?` : `Reactivate ${statusFor?.name}?`}
        description={suspending ? "The store and its listings go offline until it is reactivated." : "The store goes back online."}
        confirmLabel={suspending ? "Suspend" : "Reactivate"}
        destructive={suspending}
        required={suspending}
        onSubmit={async (reason) => {
          if (!statusFor) return;
          await setStoreStatus(statusFor.id, { status: suspending ? "suspended" : "active", reason });
          toast.success(suspending ? "Store suspended." : "Store reactivated.");
          reload();
        }}
      />
    </>
  );
}

const FIELDS = ["name", "slug", "description", "contact_email", "contact_phone", "policies"] as const;

function StoreForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const form = useForm<StoreValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store.name,
      slug: store.slug,
      description: store.description ?? "",
      contact_email: store.contact_email ?? "",
      contact_phone: store.contact_phone ?? "",
      policies: store.policies ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await updateStore(store.id, {
        name: values.name,
        slug: values.slug,
        description: nullable(values.description),
        contact_email: nullable(values.contact_email),
        contact_phone: nullable(values.contact_phone),
        policies: nullable(values.policies),
      });
      toast.success("Store saved.");
      onDone();
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Edit {store.name}</DialogTitle>
      </DialogHeader>
      <Field label="Name" htmlFor="s-name" error={errors.name?.message}>
        <Input id="s-name" maxLength={120} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>
      <Field label="Slug" htmlFor="s-slug" error={errors.slug?.message} hint="Changing it changes the store's URL.">
        <Input id="s-slug" maxLength={60} aria-invalid={Boolean(errors.slug)} {...form.register("slug")} />
      </Field>
      <Field label="Description" htmlFor="s-description" error={errors.description?.message}>
        <Textarea id="s-description" rows={3} maxLength={2000} {...form.register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email" htmlFor="s-email" error={errors.contact_email?.message}>
          <Input id="s-email" type="email" aria-invalid={Boolean(errors.contact_email)} {...form.register("contact_email")} />
        </Field>
        <Field label="Contact phone" htmlFor="s-phone" error={errors.contact_phone?.message} hint="A UAE number, e.g. 050 123 4567. The server checks the format.">
          <Input id="s-phone" type="tel" aria-invalid={Boolean(errors.contact_phone)} {...form.register("contact_phone")} />
        </Field>
      </div>
      <Field label="Policies" htmlFor="s-policies" error={errors.policies?.message}>
        <Textarea id="s-policies" rows={4} maxLength={5000} {...form.register("policies")} />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
