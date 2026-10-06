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
import { Switch } from "@/components/ui/switch";
import { createBrand, deleteBrandLogo, updateBrand, uploadBrandLogo } from "@/lib/api/catalog";
import { slugify } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { brandSchema, type BrandOutput, type BrandValues } from "@/lib/schemas/catalog";
import type { Brand } from "@/types/api";

const FIELDS = ["name", "slug", "is_active"] as const;

/** brand: undefined = closed, null = new, Brand = edit. */
export function BrandDialog({
  brand,
  onClose,
  onSaved,
  onLogoChange,
}: {
  brand: Brand | null | undefined;
  onClose: () => void;
  onSaved: () => void;
  onLogoChange: (brand: Brand) => void;
}) {
  return (
    <Dialog open={brand !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {brand !== undefined && (
          <BrandForm key={brand?.id ?? "new"} brand={brand} onClose={onClose} onSaved={onSaved} onLogoChange={onLogoChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BrandForm({
  brand,
  onClose,
  onSaved,
  onLogoChange,
}: {
  brand: Brand | null;
  onClose: () => void;
  onSaved: () => void;
  onLogoChange: (brand: Brand) => void;
}) {
  const form = useForm<BrandValues, unknown, BrandOutput>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: brand?.name ?? "", slug: brand?.slug ?? "", is_active: brand?.is_active ?? true },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (brand) await updateBrand(brand.id, values);
      else await createBrand(values);
      toast.success(brand ? "Brand saved." : "Brand created.");
      onSaved();
      onClose();
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{brand ? `Edit ${brand.name}` : "New brand"}</DialogTitle>
      </DialogHeader>
      <Field label="Name" htmlFor="b-name" error={errors.name?.message}>
        <Input
          id="b-name"
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          {...form.register("name", {
            onChange: (e) => {
              if (!brand && !dirtyFields.slug) form.setValue("slug", slugify(e.target.value));
            },
          })}
        />
      </Field>
      <Field label="Slug" htmlFor="b-slug" error={errors.slug?.message}>
        <Input id="b-slug" maxLength={120} aria-invalid={Boolean(errors.slug)} {...form.register("slug")} />
      </Field>
      <Controller
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <Label className="font-normal">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Active (vendors can pick it)
          </Label>
        )}
      />
      {brand && (
        <Field label="Logo">
          <ImageField
            url={brand.logo_url}
            alt={brand.name}
            onUpload={async (image) => {
              onLogoChange(await uploadBrandLogo(brand.id, image));
              onSaved();
            }}
            onRemove={async () => {
              await deleteBrandLogo(brand.id);
              onLogoChange({ ...brand, logo_url: null });
              onSaved();
            }}
          />
        </Field>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {brand ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
