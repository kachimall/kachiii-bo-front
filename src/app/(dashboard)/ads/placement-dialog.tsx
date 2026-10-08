"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateAdPlacement } from "@/lib/api/ads";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { AdPlacementTerms } from "@/types/api";

const AMOUNT = /^\d{1,7}(\.\d{1,2})?$/;

/** A placement's terms (UpdateAdPlacementRequest): only the changed ones are sent. */
export function PlacementDialog({
  terms,
  onClose,
  onSaved,
}: {
  terms: AdPlacementTerms | null;
  onClose: () => void;
  onSaved: (terms: AdPlacementTerms) => void;
}) {
  return (
    <Dialog open={terms !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">{terms && <PlacementForm key={terms.key} terms={terms} onSaved={onSaved} />}</DialogContent>
    </Dialog>
  );
}

type Errors = { weekly_price?: string; shown_at_once?: string; is_active?: string };

function PlacementForm({ terms, onSaved }: { terms: AdPlacementTerms; onSaved: (terms: AdPlacementTerms) => void }) {
  const [price, setPrice] = useState(terms.weekly_price);
  const [shown, setShown] = useState(String(terms.shown_at_once));
  const [active, setActive] = useState(terms.is_active);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!AMOUNT.test(price.trim()) || Number(price) < 1 || Number(price) > 1_000_000) next.weekly_price = "Enter AED 1 to 1,000,000, e.g. 250 or 250.50.";
    if (!/^\d+$/.test(shown.trim()) || Number(shown) < 1 || Number(shown) > 20) next.shown_at_once = "Use 1 to 20 ads.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: Parameters<typeof updateAdPlacement>[1] = {};
    if (Number(price) !== Number(terms.weekly_price)) body.weekly_price = price.trim();
    if (Number(shown) !== terms.shown_at_once) body.shown_at_once = Number(shown);
    if (active !== terms.is_active) body.is_active = active;
    if (Object.keys(body).length === 0) return onSaved(terms);

    setPending(true);
    try {
      onSaved(await updateAdPlacement(terms.key, body));
      toast.success("Placement updated.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors({
          weekly_price: error.firstError("weekly_price"),
          shown_at_once: error.firstError("shown_at_once"),
          is_active: error.firstError("is_active"),
        });
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{terms.name}</DialogTitle>
        <DialogDescription>Ads booked before keep their price. Closing bookings lets live ads run on.</DialogDescription>
      </DialogHeader>
      <fieldset disabled={pending} className="grid gap-4">
        <Field label="Weekly price (AED)" htmlFor="pl-price" error={errors.weekly_price}>
          <Input id="pl-price" inputMode="decimal" value={price} aria-invalid={Boolean(errors.weekly_price)} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field
          label="Ads shown at once"
          htmlFor="pl-shown"
          error={errors.shown_at_once}
          hint="Its live ads take turns in this many slots (1–20)."
        >
          <Input id="pl-shown" inputMode="numeric" value={shown} aria-invalid={Boolean(errors.shown_at_once)} onChange={(e) => setShown(e.target.value)} />
        </Field>
        <div className="grid gap-1.5">
          <Label className="font-normal">
            <Switch checked={active} onCheckedChange={setActive} />
            Open for new bookings
          </Label>
          {errors.is_active && <p className="text-xs text-destructive">{errors.is_active}</p>}
        </div>
      </fieldset>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
