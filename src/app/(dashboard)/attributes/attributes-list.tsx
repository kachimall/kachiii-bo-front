"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { createAttribute, deleteAttribute, listAttributes, updateAttribute } from "@/lib/api/catalog";
import { handleFormError, runAction } from "@/lib/forms";
import { attributeSchema, type AttributeOutput, type AttributeValues } from "@/lib/schemas/catalog";
import { useCan } from "@/store/auth";
import type { CatalogAttribute } from "@/types/api";

export function AttributesList() {
  const can = useCan();
  const allowed = can("products.view");
  const canManage = can("categories.manage");
  const { data, error, loading, reload } = useApi(allowed ? "attributes" : null, listAttributes);
  const [editing, setEditing] = useState<CatalogAttribute | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<CatalogAttribute | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Attributes"
        description="Product details vendors can fill in (e.g. Material, Origin), in the order of their position."
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon /> New attribute
            </Button>
          )
        }
      />
      <ListPanel rows={data} loading={loading} error={error} onRetry={reload} empty={{ title: "No attributes yet" }}>
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((attribute) => (
                <TableRow key={attribute.id}>
                  <TableCell className="font-medium">{attribute.name}</TableCell>
                  <TableCell>{attribute.position}</TableCell>
                  <TableCell>
                    <StatusBadge status={attribute.is_active ? "active" : "inactive"} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(attribute)} aria-label={`Edit ${attribute.name}`}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(attribute)} aria-label={`Delete ${attribute.name}`}>
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

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="sm:max-w-sm">
          {editing !== undefined && (
            <AttributeForm key={editing?.id ?? "new"} attribute={editing} onDone={() => { setEditing(undefined); reload(); }} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "attribute"}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteAttribute(toDelete.id), "Attribute deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}

const FIELDS = ["name", "position", "is_active"] as const;

function AttributeForm({ attribute, onDone }: { attribute: CatalogAttribute | null; onDone: () => void }) {
  const form = useForm<AttributeValues, unknown, AttributeOutput>({
    resolver: zodResolver(attributeSchema),
    defaultValues: {
      name: attribute?.name ?? "",
      position: attribute?.position ?? 0,
      is_active: attribute?.is_active ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (attribute) await updateAttribute(attribute.id, values);
      else await createAttribute(values);
      toast.success(attribute ? "Attribute saved." : "Attribute created.");
      onDone();
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{attribute ? `Edit ${attribute.name}` : "New attribute"}</DialogTitle>
      </DialogHeader>
      <Field label="Name" htmlFor="a-name" error={errors.name?.message}>
        <Input id="a-name" maxLength={30} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>
      <Field label="Position" htmlFor="a-position" error={errors.position?.message}>
        <Input id="a-position" type="number" min={0} max={1000} {...form.register("position")} />
      </Field>
      <Controller
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <Label className="font-normal">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Active
          </Label>
        )}
      />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {attribute ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
