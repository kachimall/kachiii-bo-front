"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageField } from "@/components/common/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { flattenCategories } from "@/hooks/use-options";
import { createCategory, deleteCategoryImage, updateCategory, uploadCategoryImage } from "@/lib/api/catalog";
import { slugify } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { categorySchema, type CategoryOutput, type CategoryValues } from "@/lib/schemas/catalog";
import type { Category } from "@/types/api";

const FIELDS = ["name", "slug", "parent_id", "position", "is_active"] as const;

export type CategoryDialogState = { mode: "create"; parentId: string | null } | { mode: "edit"; category: Category };

export function CategoryDialog({
  state,
  tree,
  onClose,
  onSaved,
  onImageChange,
}: {
  state: CategoryDialogState | null;
  tree: Category[];
  onClose: () => void;
  onSaved: () => void;
  /** The edited category after its image changed; the dialog stays open. */
  onImageChange: (category: Category) => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {state && <CategoryForm
            key={state.mode === "edit" ? state.category.id : `new-${state.parentId}`}
            state={state}
            tree={tree}
            onClose={onClose}
            onSaved={onSaved}
            onImageChange={onImageChange}
          />}
      </DialogContent>
    </Dialog>
  );
}

function descendantIds(category: Category): string[] {
  return (category.children ?? []).flatMap((child) => [child.id, ...descendantIds(child)]);
}

function CategoryForm({
  state,
  tree,
  onClose,
  onSaved,
  onImageChange,
}: {
  state: CategoryDialogState;
  tree: Category[];
  onClose: () => void;
  onSaved: () => void;
  onImageChange: (category: Category) => void;
}) {
  const editing = state.mode === "edit" ? state.category : null;
  const form = useForm<CategoryValues, unknown, CategoryOutput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: editing?.name ?? "",
      slug: editing?.slug ?? "",
      parent_id: editing ? (editing.parent_id ?? "") : (state.mode === "create" ? (state.parentId ?? "") : ""),
      position: editing?.position ?? 0,
      is_active: editing?.is_active ?? true,
    },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;

  // A category cannot move under itself or one of its own children.
  const excluded = new Set(editing ? [editing.id, ...descendantIds(editing)] : []);
  const parents = flattenCategories(tree).filter((option) => !excluded.has(option.value));

  const submit = form.handleSubmit(async (values) => {
    const body = { ...values, parent_id: values.parent_id || null };
    try {
      if (editing) await updateCategory(editing.id, body);
      else await createCategory(body);
      toast.success(editing ? "Category saved." : "Category created.");
      onSaved();
      onClose();
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${editing.name}` : "New category"}</DialogTitle>
      </DialogHeader>
      <Field label="Name" htmlFor="c-name" error={errors.name?.message}>
        <Input
          id="c-name"
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          {...form.register("name", {
            onChange: (e) => {
              if (!editing && !dirtyFields.slug) form.setValue("slug", slugify(e.target.value));
            },
          })}
        />
      </Field>
      <Field label="Slug" htmlFor="c-slug" error={errors.slug?.message} hint="Used in storefront URLs.">
        <Input id="c-slug" maxLength={120} aria-invalid={Boolean(errors.slug)} {...form.register("slug")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field label="Parent" htmlFor="c-parent" error={errors.parent_id?.message}>
          <NativeSelect id="c-parent" {...form.register("parent_id")}>
            <option value="">None (top level)</option>
            {parents.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Position" htmlFor="c-position" error={errors.position?.message}>
          <Input id="c-position" type="number" min={0} max={65535} {...form.register("position")} />
        </Field>
      </div>
      <Controller
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <Label className="font-normal">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Active (shown on the storefront)
          </Label>
        )}
      />
      {editing && (
        <Field label="Image">
          <ImageField
            url={editing.image_url}
            alt={editing.name}
            onUpload={async (image) => {
              const updated = await uploadCategoryImage(editing.id, image);
              onImageChange({ ...editing, image_url: updated.image_url });
              onSaved();
            }}
            onRemove={async () => {
              await deleteCategoryImage(editing.id);
              onImageChange({ ...editing, image_url: null });
              onSaved();
            }}
          />
        </Field>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {editing ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
