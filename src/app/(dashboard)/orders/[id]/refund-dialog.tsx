"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { RefundInput } from "@/lib/api/orders";
import type { Purchase, RefundCharge } from "@/types/api";

const AMOUNT = /^\d{1,7}(\.\d{1,2})?$/;

type Errors = Partial<Record<keyof RefundInput | "form", string>>;

/**
 * Refunds part of a paid order (RefundController::store): through the gateway when paid online, or
 * owed in cash for cash on delivery, which KACHI pays back itself and then records (FN9).
 */
export function RefundDialog({
  order,
  open,
  onOpenChange,
  onSubmit,
}: {
  order: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: RefundInput) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <RefundForm order={order} onOpenChange={onOpenChange} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function RefundForm({
  order,
  onOpenChange,
  onSubmit,
}: {
  order: Purchase;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: RefundInput) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [orderId, setOrderId] = useState(order.orders.length === 1 ? order.orders[0].id : "");
  const [chargedTo, setChargedTo] = useState<RefundCharge>("vendor");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    const value = amount.trim();
    if (!AMOUNT.test(value) || Number(value) <= 0) next.amount = "Enter an amount like 50 or 49.50.";
    if (reason.trim() === "") next.reason = "Give a reason.";
    if (chargedTo === "vendor" && orderId === "") next.order_id = "Pick the store whose vendor bears the refund.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onSubmit({ amount: value, reason: reason.trim(), order_id: orderId || undefined, charged_to: chargedTo });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors({
          amount: err.firstError("amount"),
          reason: err.firstError("reason"),
          order_id: err.firstError("order_id"),
          charged_to: err.firstError("charged_to"),
        });
      } else {
        setErrors({ form: errorMessage(err) });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Issue a refund</DialogTitle>
        <DialogDescription>
          {order.payment_method === "cash_on_delivery"
            ? "Owed back to the buyer, up to the cash the courier collected. KACHI pays it back itself, then records the payment on the refund."
            : "Paid back to the buyer's card through the gateway, up to what is left of the payment."}{" "}
          The buyer sees the reason after “Refunded by KACHI:”.
        </DialogDescription>
      </DialogHeader>
      <Field label={`Amount (${order.currency_code})`} htmlFor="refund-amount" error={errors.amount}>
        <Input
          id="refund-amount"
          inputMode="decimal"
          value={amount}
          placeholder="50.00"
          aria-invalid={Boolean(errors.amount)}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Store's order" htmlFor="refund-order" error={errors.order_id} hint="The order the refund is for.">
        <NativeSelect id="refund-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} aria-invalid={Boolean(errors.order_id)}>
          <option value="">The whole purchase</option>
          {order.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.store.name} · #{o.number}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Charged to" htmlFor="refund-charge" error={errors.charged_to} hint="Who bears it in the payouts.">
        <NativeSelect id="refund-charge" value={chargedTo} onChange={(e) => setChargedTo(e.target.value as RefundCharge)}>
          <option value="vendor">The store&apos;s vendor</option>
          <option value="kachi">KACHI</option>
        </NativeSelect>
      </Field>
      <Field label="Reason" htmlFor="refund-reason" error={errors.reason ?? errors.form} hint={`${reason.trim().length}/200`}>
        <Textarea
          id="refund-reason"
          value={reason}
          rows={3}
          maxLength={200}
          aria-invalid={Boolean(errors.reason)}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Issue refund
        </Button>
      </DialogFooter>
    </form>
  );
}
