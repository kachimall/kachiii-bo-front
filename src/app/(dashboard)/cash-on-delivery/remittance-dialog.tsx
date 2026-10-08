"use client";

import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage } from "@/lib/api/client";
import { createCodRemittance } from "@/lib/api/finance";
import { formatMoney, fromUaeInput, toUaeInput } from "@/lib/format";
import type { CodPackage } from "@/types/api";

const AMOUNT = /^\d{1,7}(\.\d{1,2})?$/;

type Errors = Partial<Record<"reference" | "remitted_at" | "amount" | "packages" | "note", string>>;

/** Records Zajel's transfer of the selected packages' cash (StoreCodRemittanceRequest). */
export function RemittanceDialog({
  open,
  onOpenChange,
  packages,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: CodPackage[];
  onRecorded: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <RemittanceForm packages={packages} onOpenChange={onOpenChange} onRecorded={onRecorded} />}
      </DialogContent>
    </Dialog>
  );
}

function RemittanceForm({
  packages,
  onOpenChange,
  onRecorded,
}: {
  packages: CodPackage[];
  onOpenChange: (open: boolean) => void;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const collected = (packages.reduce((sum, pkg) => sum + Math.round(Number(pkg.cod_amount) * 100), 0) / 100).toFixed(2);
  const [reference, setReference] = useState("");
  const [remittedAt, setRemittedAt] = useState(() => toUaeInput(new Date().toISOString()));
  const [amount, setAmount] = useState(collected);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const fee = AMOUNT.test(amount.trim()) ? (Number(collected) - Number(amount)).toFixed(2) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (reference.trim() === "") next.reference = "Enter Zajel's reference for the transfer.";
    if (!remittedAt) next.remitted_at = "Enter when the transfer was made.";
    else if (new Date(fromUaeInput(remittedAt)).getTime() > Date.now()) next.remitted_at = "The transfer cannot be in the future.";
    if (!AMOUNT.test(amount.trim()) || Number(amount) <= 0) next.amount = "Enter the amount received, e.g. 1234.50.";
    else if (Number(amount) > Number(collected)) next.amount = `At most what the packages collected, ${formatMoney(collected)}.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const remittance = await createCodRemittance({
        reference: reference.trim(),
        remitted_at: fromUaeInput(remittedAt),
        amount: amount.trim(),
        packages: packages.map((pkg) => pkg.id),
        note: note.trim() || null,
      });
      toast.success("Transfer recorded.");
      onRecorded();
      onOpenChange(false);
      router.push(`/cash-on-delivery/remittances/${remittance.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const fields: Errors = {};
        for (const [field, messages] of Object.entries(error.errors)) {
          const key = (field.startsWith("packages") ? "packages" : field) as keyof Errors;
          fields[key] ??= messages[0];
        }
        setErrors(fields);
        if (Object.keys(fields).length === 0) toast.error(error.message);
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
        <DialogTitle>Record a transfer from Zajel</DialogTitle>
        <DialogDescription>
          {packages.length} {packages.length === 1 ? "package" : "packages"} that collected {formatMoney(collected)}. What Zajel kept is its fee.
        </DialogDescription>
      </DialogHeader>
      <fieldset disabled={pending} className="grid gap-4">
        <Field label="Reference" htmlFor="rm-ref" error={errors.reference} hint="As on Zajel's statement, e.g. ZJ-REM-20261012.">
          <Input id="rm-ref" value={reference} maxLength={100} autoFocus aria-invalid={Boolean(errors.reference)} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Transferred (UAE time)" htmlFor="rm-at" error={errors.remitted_at}>
          <Input id="rm-at" type="datetime-local" value={remittedAt} aria-invalid={Boolean(errors.remitted_at)} onChange={(e) => setRemittedAt(e.target.value)} />
        </Field>
        <Field
          label="Amount received (AED)"
          htmlFor="rm-amount"
          error={errors.amount}
          hint={fee !== null && Number(fee) >= 0 ? `Zajel's fee: ${formatMoney(fee)}` : undefined}
        >
          <Input id="rm-amount" inputMode="decimal" value={amount} aria-invalid={Boolean(errors.amount)} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="rm-note" error={errors.note}>
          <Textarea id="rm-note" value={note} rows={2} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {errors.packages && (
          <p role="alert" className="text-sm text-destructive">
            {errors.packages}
          </p>
        )}
      </fieldset>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Record transfer
        </Button>
      </DialogFooter>
    </form>
  );
}
