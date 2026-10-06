"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { getSettings, updateSettings } from "@/lib/api/settings";
import { handleFormError } from "@/lib/forms";
import { settingsSchema, type SettingsValues } from "@/lib/schemas/settings";
import { useCan } from "@/store/auth";
import type { Settings } from "@/types/api";

const FIELDS = [
  "unpaid_order_minutes",
  "ship_deadline_days",
  "cash_on_delivery_enabled",
  "cash_on_delivery_max_total",
  "cod_refusal_limit",
  "return_days",
  "return_reply_days",
  "return_dispute_days",
  "delivery_fee_mode",
  "delivery_flat_fee",
  "free_delivery_min_total",
] as const;

function toForm(s: Settings): SettingsValues {
  return {
    unpaid_order_minutes: String(s.unpaid_order_minutes),
    ship_deadline_days: String(s.ship_deadline_days),
    cash_on_delivery_enabled: Boolean(s.cash_on_delivery_enabled),
    cash_on_delivery_max_total: String(s.cash_on_delivery_max_total),
    cod_refusal_limit: String(s.cod_refusal_limit ?? 2),
    return_days: String(s.return_days ?? 7),
    return_reply_days: String(s.return_reply_days ?? 2),
    return_dispute_days: String(s.return_dispute_days ?? 7),
    delivery_fee_mode: s.delivery_fee_mode,
    delivery_flat_fee: String(s.delivery_flat_fee),
    free_delivery_min_total: s.free_delivery_min_total === null ? "" : String(s.free_delivery_min_total),
  };
}

export function SettingsPage() {
  const can = useCan();
  const allowed = can("settings.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? "settings" : null, getSettings);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader title="Settings" description="Order rules, returns, cash on delivery and delivery fees for the whole marketplace." />
      <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
        {(settings) => <SettingsForm settings={settings} readOnly={!can("settings.manage")} onSaved={mutate} />}
      </AsyncContent>
    </>
  );
}

function SettingsForm({ settings, readOnly, onSaved }: { settings: Settings; readOnly: boolean; onSaved: (s: Settings) => void }) {
  const form = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: toForm(settings) });
  const { errors, isSubmitting, isDirty } = form.formState;
  const codEnabled = useWatch({ control: form.control, name: "cash_on_delivery_enabled" });
  const feeMode = useWatch({ control: form.control, name: "delivery_fee_mode" });

  const submit = form.handleSubmit(async (v) => {
    try {
      const saved = await updateSettings({
        unpaid_order_minutes: Number(v.unpaid_order_minutes),
        ship_deadline_days: Number(v.ship_deadline_days),
        cash_on_delivery_enabled: v.cash_on_delivery_enabled,
        cash_on_delivery_max_total: Number(v.cash_on_delivery_max_total),
        cod_refusal_limit: Number(v.cod_refusal_limit),
        return_days: Number(v.return_days),
        return_reply_days: Number(v.return_reply_days),
        return_dispute_days: Number(v.return_dispute_days),
        delivery_fee_mode: v.delivery_fee_mode,
        delivery_flat_fee: Number(v.delivery_flat_fee),
        free_delivery_min_total: v.free_delivery_min_total === "" ? null : Number(v.free_delivery_min_total),
      });
      onSaved(saved);
      form.reset(toForm(saved));
      toast.success("Settings saved.");
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly || isSubmitting} className="grid gap-6 lg:grid-cols-2">
        <Section title="Orders">
          <div className="grid gap-4">
            <Field
              label="Unpaid order timeout (minutes)"
              htmlFor="st-unpaid"
              error={errors.unpaid_order_minutes?.message}
              hint="How long stock is held for an online payment before the order is cancelled (5–1440)."
            >
              <Input id="st-unpaid" inputMode="numeric" aria-invalid={Boolean(errors.unpaid_order_minutes)} {...form.register("unpaid_order_minutes")} />
            </Field>
            <Field
              label="Ship deadline (days)"
              htmlFor="st-ship"
              error={errors.ship_deadline_days?.message}
              hint="Days a vendor has from placement to pack an order before it is cancelled (1–30)."
            >
              <Input id="st-ship" inputMode="numeric" aria-invalid={Boolean(errors.ship_deadline_days)} {...form.register("ship_deadline_days")} />
            </Field>
          </div>
        </Section>

        <Section title="Cash on delivery">
          <div className="grid gap-4">
            <Controller
              control={form.control}
              name="cash_on_delivery_enabled"
              render={({ field }) => (
                <Label className="font-normal">
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                  Buyers can pay cash on delivery
                </Label>
              )}
            />
            <Field
              label="Maximum order total (AED)"
              htmlFor="st-cod-max"
              error={errors.cash_on_delivery_max_total?.message}
              hint={codEnabled ? "Orders above this must be paid online." : "Applies when cash on delivery is on."}
            >
              <Input id="st-cod-max" inputMode="decimal" aria-invalid={Boolean(errors.cash_on_delivery_max_total)} {...form.register("cash_on_delivery_max_total")} />
            </Field>
            <Field
              label="Refused parcels allowed"
              htmlFor="st-cod-refusals"
              error={errors.cod_refusal_limit?.message}
              hint="After this many parcels refused at the door, cash on delivery switches off for that buyer (1–10)."
            >
              <Input id="st-cod-refusals" inputMode="numeric" aria-invalid={Boolean(errors.cod_refusal_limit)} {...form.register("cod_refusal_limit")} />
            </Field>
          </div>
        </Section>

        <Section title="Returns" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Return window (days)"
              htmlFor="st-return-days"
              error={errors.return_days?.message}
              hint="Days after delivery a buyer may ask to return items (1–90)."
            >
              <Input id="st-return-days" inputMode="numeric" aria-invalid={Boolean(errors.return_days)} {...form.register("return_days")} />
            </Field>
            <Field
              label="Store reply time (days)"
              htmlFor="st-return-reply"
              error={errors.return_reply_days?.message}
              hint="Days a store has to answer a return request before KACHI decides it (1–14)."
            >
              <Input id="st-return-reply" inputMode="numeric" aria-invalid={Boolean(errors.return_reply_days)} {...form.register("return_reply_days")} />
            </Field>
            <Field
              label="Dispute window (days)"
              htmlFor="st-return-dispute"
              error={errors.return_dispute_days?.message}
              hint="Days a buyer has to ask KACHI to review a store's rejection (1–30)."
            >
              <Input id="st-return-dispute" inputMode="numeric" aria-invalid={Boolean(errors.return_dispute_days)} {...form.register("return_dispute_days")} />
            </Field>
          </div>
          {settings.payout_hold_days !== undefined && (
            // Read-only here: PATCH /admin/settings ignores it; it changes at /admin/payout-settings.
            <p className="mt-4 text-xs text-muted-foreground">
              Sales count towards a vendor payout {settings.payout_hold_days} {settings.payout_hold_days === 1 ? "day" : "days"} after
              delivery. Staff with payouts access change this on the{" "}
              <Link href="/payouts" className="text-secondary hover:underline">
                Payouts
              </Link>{" "}
              page.
            </p>
          )}
        </Section>

        <Section title="Delivery fees" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Fee for the cheapest service"
              htmlFor="st-mode"
              error={errors.delivery_fee_mode?.message}
              hint="A faster service costs the difference on top."
            >
              <NativeSelect id="st-mode" {...form.register("delivery_fee_mode")}>
                <option value="courier">The courier&apos;s rate</option>
                <option value="flat">A flat fee</option>
              </NativeSelect>
            </Field>
            <Field
              label="Flat fee (AED)"
              htmlFor="st-flat"
              error={errors.delivery_flat_fee?.message}
              hint={feeMode === "flat" ? "Charged per package." : "Used when the mode is flat."}
            >
              <Input id="st-flat" inputMode="decimal" aria-invalid={Boolean(errors.delivery_flat_fee)} {...form.register("delivery_flat_fee")} />
            </Field>
            <Field
              label="Free delivery from (AED)"
              htmlFor="st-free"
              error={errors.free_delivery_min_total?.message}
              hint="A package costing at least this ships free. Empty turns it off."
            >
              <Input id="st-free" inputMode="decimal" placeholder="Off" aria-invalid={Boolean(errors.free_delivery_min_total)} {...form.register("free_delivery_min_total")} />
            </Field>
          </div>
        </Section>
      </fieldset>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">You can view these settings; changing them needs the settings.manage permission.</p>
      ) : (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset(toForm(settings))}>
            Discard changes
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Save settings
          </Button>
        </div>
      )}
    </form>
  );
}
