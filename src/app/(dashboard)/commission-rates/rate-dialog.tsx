"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { Option } from "@/hooks/use-options";

const RATE = /^\d{1,3}(\.\d{1,2})?$/;

export interface RateDialogState {
  title: string;
  description?: string;
  /** The current rate, or "" for none. */
  rate: string;
  /** Pick what the rate is for (a category or a vendor); omitted when it is fixed. */
  options?: (Option & { depth?: number })[];
  optionLabel?: string;
  /** An empty rate removes the own rate, falling back to the category's or the default. */
  removable?: boolean;
}

/** Sets a commission rate in percent, 0–100 to the hundredth (CommissionRateController). */
export function RateDialog({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: RateDialogState | null;
  onOpenChange: (open: boolean) => void;
  /** target is the picked option's value, when there are options. Throw to keep the dialog open. */
  onSubmit: (rate: string | null, target?: string) => Promise<void>;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state && <RateForm state={state} onOpenChange={onOpenChange} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function RateForm({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: RateDialogState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rate: string | null, target?: string) => Promise<void>;
}) {
  const [rate, setRate] = useState(state.rate);
  const [target, setTarget] = useState("");
  const [errors, setErrors] = useState<{ rate?: string; target?: string }>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = rate.trim();
    const next: typeof errors = {};
    if (state.options && target === "") next.target = `Pick a ${state.optionLabel?.toLowerCase() ?? "target"}.`;
    if (value === "" ? !state.removable : !RATE.test(value) || Number(value) > 100) next.rate = "Enter a rate from 0 to 100, like 12.5.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onSubmit(value === "" ? null : value, state.options ? target : undefined);
      onOpenChange(false);
    } catch (err) {
      setErrors({ rate: err instanceof ApiError ? (err.firstError("rate") ?? errorMessage(err)) : errorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{state.title}</DialogTitle>
        {state.description && <DialogDescription>{state.description}</DialogDescription>}
      </DialogHeader>
      {state.options && (
        <Field label={state.optionLabel ?? "For"} htmlFor="rate-target" error={errors.target}>
          <NativeSelect id="rate-target" value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={Boolean(errors.target)}>
            <option value="">Choose…</option>
            {state.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field
        label="Rate (%)"
        htmlFor="rate-value"
        error={errors.rate}
        hint={state.removable ? "Leave empty to remove this rate." : "Charged on each line's total."}
      >
        <Input
          id="rate-value"
          inputMode="decimal"
          value={rate}
          placeholder={state.removable ? "None" : "10.00"}
          aria-invalid={Boolean(errors.rate)}
          onChange={(e) => setRate(e.target.value)}
          autoFocus={!state.options}
        />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save rate
        </Button>
      </DialogFooter>
    </form>
  );
}
