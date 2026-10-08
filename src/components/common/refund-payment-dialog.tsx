"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api/client";
import { recordRefundPayment } from "@/lib/api/finance";
import { formatMoney, fromUaeInput, toUaeInput } from "@/lib/format";
import type { Refund } from "@/types/api";

/**
 * Records that KACHI paid a cash-on-delivery refund back itself (DECISIONS FN9), e.g. by bank
 * transfer: the buyer gets the "refund processed" email, and one charged to the store comes out
 * of its earnings.
 */
export function RefundPaymentDialog({
  refund,
  onOpenChange,
  onRecorded,
}: {
  refund: Refund | null;
  onOpenChange: (open: boolean) => void;
  onRecorded: (refund: Refund) => void;
}) {
  return (
    <Dialog open={refund !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {refund && <PaymentForm key={refund.id} refund={refund} onOpenChange={onOpenChange} onRecorded={onRecorded} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  refund,
  onOpenChange,
  onRecorded,
}: {
  refund: Refund;
  onOpenChange: (open: boolean) => void;
  onRecorded: (refund: Refund) => void;
}) {
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(() => toUaeInput(new Date().toISOString()));
  const [errors, setErrors] = useState<{ reference?: string; paid_at?: string }>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (reference.trim() === "") next.reference = "Enter the payment's reference, e.g. the bank transfer's.";
    if (paidAt && new Date(fromUaeInput(paidAt)).getTime() > Date.now()) next.paid_at = "The payment cannot be in the future.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const saved = await recordRefundPayment(refund.id, { reference: reference.trim(), paid_at: paidAt ? fromUaeInput(paidAt) : null });
      toast.success("Refund recorded as paid. The buyer has been emailed.");
      onRecorded(saved);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors({ reference: error.firstError("reference"), paid_at: error.firstError("paid_at") });
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
        <DialogTitle>Record the refund as paid</DialogTitle>
        <DialogDescription>
          {formatMoney(refund.amount)} paid back to the buyer by KACHI for a cash-on-delivery order
          {refund.order ? ` (${refund.order.number})` : ""}. The buyer is emailed
          {refund.charged_to === "vendor" ? ", and the amount comes out of the store's earnings" : ""}.
        </DialogDescription>
      </DialogHeader>
      <fieldset disabled={pending} className="grid gap-4">
        <Field label="Reference" htmlFor="rp-ref" error={errors.reference} hint="Up to 100 characters.">
          <Input id="rp-ref" value={reference} maxLength={100} autoFocus aria-invalid={Boolean(errors.reference)} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Paid (UAE time)" htmlFor="rp-at" error={errors.paid_at} hint="Leave empty for now.">
          <Input id="rp-at" type="datetime-local" value={paidAt} aria-invalid={Boolean(errors.paid_at)} onChange={(e) => setPaidAt(e.target.value)} />
        </Field>
      </fieldset>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Record payment
        </Button>
      </DialogFooter>
    </form>
  );
}
