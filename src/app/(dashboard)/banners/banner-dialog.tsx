"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageField } from "@/components/common/image-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  createBanner,
  deleteBannerImage,
  updateBanner,
  uploadBannerImage,
  type BannerImageKind,
  type BannerInput,
} from "@/lib/api/content";
import { fromUaeInput, toUaeInput } from "@/lib/format";
import { handleFormError, nullable } from "@/lib/forms";
import { bannerSchema, type BannerOutput, type BannerValues } from "@/lib/schemas/content";
import type { Banner, BannerPlacement } from "@/types/api";

const FIELDS = [
  "placement",
  "name",
  "alt_text",
  "headline",
  "subheadline",
  "button_label",
  "link_url",
  "starts_at",
  "ends_at",
  "show_countdown",
  "is_active",
] as const;

export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  home_carousel: "Home carousel",
  home_side: "Home side cards",
};

// StoreBannerImageRequest: up to 5 MB, at most 5000 px on each side.
const IMAGE_RULES: Record<BannerImageKind, { label: string; hint: string }> = {
  desktop: {
    label: "Desktop image",
    hint: "JPG, PNG or WebP, up to 5 MB, at least 1200 × 400 px (at most 5000 px). Needed before the banner can go live.",
  },
  mobile: {
    label: "Mobile image (optional)",
    hint: "JPG, PNG or WebP, up to 5 MB, at least 600 × 400 px (at most 5000 px). Phones show the desktop image without one.",
  },
};

function defaults(banner: Banner | null, placement: BannerPlacement): BannerValues {
  return {
    placement: banner?.placement ?? placement,
    name: banner?.name ?? "",
    alt_text: banner?.alt_text ?? "",
    headline: banner?.headline ?? "",
    subheadline: banner?.subheadline ?? "",
    button_label: banner?.button_label ?? "",
    link_url: banner?.link_url ?? "",
    starts_at: toUaeInput(banner?.starts_at),
    ends_at: toUaeInput(banner?.ends_at),
    show_countdown: banner?.show_countdown ?? false,
    is_active: banner?.is_active ?? false,
  };
}

function toInput(v: BannerOutput): BannerInput {
  return {
    placement: v.placement,
    name: v.name,
    alt_text: v.alt_text,
    headline: nullable(v.headline),
    subheadline: nullable(v.subheadline),
    button_label: nullable(v.button_label),
    link_url: nullable(v.link_url),
    // UAE time with its offset: the API keeps it exact and stores it in UTC.
    starts_at: v.starts_at ? fromUaeInput(v.starts_at) : null,
    ends_at: v.ends_at ? fromUaeInput(v.ends_at) : null,
    show_countdown: v.show_countdown,
    is_active: v.is_active,
  };
}

/** state: undefined = closed, {banner: null} = new in that placement, {banner} = edit. */
export type BannerDialogState = { banner: Banner | null; placement: BannerPlacement } | undefined;

export function BannerDialog({
  state,
  readOnly,
  onClose,
  onChange,
}: {
  state: BannerDialogState;
  readOnly: boolean;
  onClose: () => void;
  /** A banner was created or changed (fields or images); the dialog stays on it. */
  onChange: (banner: Banner) => void;
}) {
  return (
    <Dialog open={state !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {state !== undefined && (
          <BannerForm
            key={state.banner?.id ?? `new-${state.placement}`}
            banner={state.banner}
            placement={state.placement}
            readOnly={readOnly}
            onChange={onChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BannerForm({
  banner,
  placement,
  readOnly,
  onChange,
}: {
  banner: Banner | null;
  placement: BannerPlacement;
  readOnly: boolean;
  onChange: (banner: Banner) => void;
}) {
  const form = useForm<BannerValues, unknown, BannerOutput>({
    resolver: zodResolver(bannerSchema),
    defaultValues: defaults(banner, placement),
  });
  const { errors, isSubmitting } = form.formState;
  const hasDesktopImage = Boolean(banner?.desktop_image_url);

  const submit = form.handleSubmit(async (values) => {
    try {
      if (banner) {
        const saved = await updateBanner(banner.id, toInput(values));
        form.reset(defaults(saved, saved.placement));
        onChange(saved);
        toast.success("Banner saved.");
      } else {
        // A new banner starts switched off: it has no desktop image yet.
        const created = await createBanner({ ...toInput(values), is_active: false });
        onChange(created);
        toast.success("Banner created. Add its desktop image, then switch it on.");
      }
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  async function setImage(kind: BannerImageKind, change: Promise<Banner>) {
    const saved = await change;
    onChange(saved);
    // Keep unsaved edits; only the switch depends on the images.
    if (kind === "desktop" && !saved.desktop_image_url) form.setValue("is_active", false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{banner ? `Edit ${banner.name}` : "New banner"}</DialogTitle>
        <DialogDescription>
          {banner
            ? "Times are in UAE time (GMT+4). A banner is live while it is switched on, has its desktop image, and is between its start and end."
            : "Save the details first, then add the images and switch the banner on. A new banner goes last in its placement."}
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={readOnly || isSubmitting} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="bn-name" error={errors.name?.message} hint="For staff; never shown in the shop.">
            <Input id="bn-name" maxLength={100} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          </Field>
          <Field
            label="Placement"
            htmlFor="bn-placement"
            error={errors.placement?.message}
            hint={banner ? "Moving it puts it last in the other placement." : undefined}
          >
            <NativeSelect id="bn-placement" {...form.register("placement")}>
              {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Alt text" htmlFor="bn-alt" error={errors.alt_text?.message} hint="What the picture shows, for screen readers.">
          <Input id="bn-alt" maxLength={150} aria-invalid={Boolean(errors.alt_text)} {...form.register("alt_text")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline" htmlFor="bn-headline" error={errors.headline?.message} hint="Optional.">
            <Input id="bn-headline" maxLength={100} aria-invalid={Boolean(errors.headline)} {...form.register("headline")} />
          </Field>
          <Field label="Button label" htmlFor="bn-button" error={errors.button_label?.message} hint="Optional, e.g. Shop now.">
            <Input id="bn-button" maxLength={40} aria-invalid={Boolean(errors.button_label)} {...form.register("button_label")} />
          </Field>
        </div>
        <Field label="Subheadline" htmlFor="bn-sub" error={errors.subheadline?.message} hint="Optional.">
          <Input id="bn-sub" maxLength={200} aria-invalid={Boolean(errors.subheadline)} {...form.register("subheadline")} />
        </Field>
        <Field
          label="Link"
          htmlFor="bn-link"
          error={errors.link_url?.message}
          hint="A path in the shop, such as /categories/shoes, or an https:// address. Optional."
        >
          <Input id="bn-link" maxLength={2048} aria-invalid={Boolean(errors.link_url)} {...form.register("link_url")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts (UAE time)" htmlFor="bn-start" error={errors.starts_at?.message} hint="Empty: as soon as it is switched on.">
            <Input id="bn-start" type="datetime-local" aria-invalid={Boolean(errors.starts_at)} {...form.register("starts_at")} />
          </Field>
          <Field label="Ends (UAE time)" htmlFor="bn-end" error={errors.ends_at?.message} hint="Empty: until switched off.">
            <Input id="bn-end" type="datetime-local" aria-invalid={Boolean(errors.ends_at)} {...form.register("ends_at")} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="show_countdown"
          render={({ field }) => (
            <div className="grid gap-1.5">
              <Label className="font-normal">
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                Show a countdown to the end
              </Label>
              {errors.show_countdown && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.show_countdown.message}
                </p>
              )}
            </div>
          )}
        />
        {banner && (
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <Label className="font-normal">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={readOnly || (!hasDesktopImage && !field.value)}
                  />
                  Switched on
                </Label>
                {errors.is_active ? (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.is_active.message}
                  </p>
                ) : (
                  !hasDesktopImage && <p className="text-xs text-muted-foreground">Add the desktop image before switching it on.</p>
                )}
              </div>
            )}
          />
        )}
      </fieldset>

      {banner &&
        (["desktop", "mobile"] as const).map((kind) => (
          <Field key={kind} label={IMAGE_RULES[kind].label}>
            <ImageField
              url={kind === "desktop" ? banner.desktop_image_url : banner.mobile_image_url}
              alt={banner.alt_text}
              disabled={readOnly}
              maxBytes={5 * 1024 * 1024}
              hint={IMAGE_RULES[kind].hint}
              previewClassName={kind === "desktop" ? "h-20 w-48" : "h-24 w-20"}
              onUpload={(image) => setImage(kind, uploadBannerImage(banner.id, kind, image))}
              onRemove={() => setImage(kind, deleteBannerImage(banner.id, kind))}
            />
          </Field>
        ))}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{readOnly || banner ? "Close" : "Cancel"}</DialogClose>
        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {banner ? "Save" : "Create"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
