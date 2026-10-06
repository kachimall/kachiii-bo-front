"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { getPayoutSettings, updatePayoutSettings } from "@/lib/api/finance";
import { handleFormError } from "@/lib/forms";
import { payoutSettingsSchema, type PayoutSettingsValues } from "@/lib/schemas/settings";
import { useCan } from "@/store/auth";
import type { PayoutSettings } from "@/types/api";

const FIELDS = ["payout_hold_days"] as const;

const toForm = (s: PayoutSettings): PayoutSettingsValues => ({ payout_hold_days: String(s.payout_hold_days) });

/** The payout rules (DECISIONS FN6). Each store's earnings are on its vendor page. */
export function PayoutsPage() {
  const can = useCan();
  const allowed = can("payouts.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? "payout-settings" : null, getPayoutSettings);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="When vendors' sales count towards a payout. Each store's earnings and ledger are on its vendor page."
      />
      <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
        {(settings) => <PayoutSettingsForm settings={settings} readOnly={!can("payouts.manage")} onSaved={mutate} />}
      </AsyncContent>
    </>
  );
}

function PayoutSettingsForm({
  settings,
  readOnly,
  onSaved,
}: {
  settings: PayoutSettings;
  readOnly: boolean;
  onSaved: (s: PayoutSettings) => void;
}) {
  const form = useForm<PayoutSettingsValues>({ resolver: zodResolver(payoutSettingsSchema), defaultValues: toForm(settings) });
  const { errors, isSubmitting, isDirty } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    try {
      const saved = await updatePayoutSettings({ payout_hold_days: Number(v.payout_hold_days) });
      onSaved(saved);
      form.reset(toForm(saved));
      toast.success("Payout settings saved.");
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid max-w-2xl gap-6">
      <Section title="Return period for payouts">
        <fieldset disabled={readOnly || isSubmitting} className="grid gap-4">
          <Field
            label="Hold after delivery (days)"
            htmlFor="po-hold"
            error={errors.payout_hold_days?.message}
            hint="Days after delivery before a sale counts towards a payout (0–30). Applies to sales recorded from now on; recorded ones keep their date. Returns and refunds charged to the store count at once."
          >
            <Input id="po-hold" inputMode="numeric" className="max-w-32" aria-invalid={Boolean(errors.payout_hold_days)} {...form.register("payout_hold_days")} />
          </Field>
        </fieldset>
      </Section>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">You can view this setting; changing it needs the payouts.manage permission.</p>
      ) : (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset(toForm(settings))}>
            Discard changes
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </div>
      )}
    </form>
  );
}
