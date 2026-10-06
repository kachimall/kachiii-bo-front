"use client";

import { Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { errorMessage } from "@/lib/api/client";
import type { CourierStatus } from "@/types/api";

const COURIER_STATUSES: { value: CourierStatus; label: string }[] = [
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivery_failed", label: "Delivery failed" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned to sender" },
];

/** What the dialog moves: a package or a return's pickup, by its waybill. */
export interface CourierTarget {
  waybill: string;
  courierStatus: CourierStatus | null;
  description: ReactNode;
  /** Hint under the reason when "returned" is picked. */
  returnedHint?: string;
}

/** Plays Zajel for a booked waybill while the backend runs its mock courier. */
export function CourierUpdateDialog({
  target,
  onOpenChange,
  onSubmit,
}: {
  target: CourierTarget | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: CourierStatus, reason?: string) => Promise<void>;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {target && <CourierUpdateForm target={target} onOpenChange={onOpenChange} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function CourierUpdateForm({
  target,
  onOpenChange,
  onSubmit,
}: {
  target: CourierTarget;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: CourierStatus, reason?: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<CourierStatus>(target.courierStatus ? "in_transit" : "picked_up");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      await onSubmit(status, reason.trim() || undefined);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Courier update</DialogTitle>
        <DialogDescription>
          Test courier only: moves waybill {target.waybill} as Zajel would. {target.description}
        </DialogDescription>
      </DialogHeader>
      <Field label="Status" htmlFor="courier-status">
        <NativeSelect id="courier-status" value={status} onChange={(e) => setStatus(e.target.value as CourierStatus)}>
          {COURIER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label="Reason (optional)"
        htmlFor="courier-reason"
        error={error}
        hint={status === "returned" && target.returnedHint ? target.returnedHint : "Up to 50 characters."}
      >
        <Input
          id="courier-reason"
          value={reason}
          maxLength={50}
          placeholder={status === "returned" ? "refused" : status === "delivery_failed" ? "nobody home" : ""}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />} disabled={pending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Record update
        </Button>
      </DialogFooter>
    </form>
  );
}
