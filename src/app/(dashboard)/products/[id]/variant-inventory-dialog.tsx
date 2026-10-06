"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Pagination } from "@/components/common/pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api/client";
import { listMovements, recordMovement } from "@/lib/api/products";
import { formatDateTime, formatOptions, humanize } from "@/lib/format";
import { handleFormError, nullable } from "@/lib/forms";
import { movementSchema, type MovementOutput, type MovementValues } from "@/lib/schemas/catalog";
import type { InventoryMovement, ProductVariant } from "@/types/api";

/**
 * The signed change of a movement. The API sends `quantity` unsigned, so the sign comes from the
 * on-hand counts; a reservation or release leaves on hand alone and moves only reserved stock.
 */
function movementChange(m: InventoryMovement): { value: number; reservedOnly: boolean } {
  const onHand = m.on_hand_after - m.on_hand_before;
  if (onHand !== 0) return { value: onHand, reservedOnly: false };
  const reserved = m.reserved_after - m.reserved_before;
  return { value: reserved !== 0 ? reserved : m.quantity, reservedOnly: reserved !== 0 };
}

export function VariantInventoryDialog({
  productId,
  variant,
  canAdjust,
  onClose,
  onAdjusted,
}: {
  productId: string;
  variant: ProductVariant;
  canAdjust: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [page, setPage] = useState(1);
  const movements = useApi(`movements:${variant.id}:${page}`, () => listMovements(productId, variant.id, { page }));
  const onHand = variant.inventory?.on_hand ?? variant.stock;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock history · {formatOptions(variant.options)}</DialogTitle>
          <DialogDescription>
            {variant.sku} · {onHand} on hand, {variant.inventory?.reserved ?? 0} reserved, threshold{" "}
            {variant.inventory?.low_stock_threshold ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {canAdjust && (
          <AdjustForm
            productId={productId}
            variantId={variant.id}
            onHand={onHand}
            onDone={() => {
              setPage(1);
              movements.reload();
              onAdjusted();
            }}
          />
        )}

        <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
          {movements.error && !movements.data ? (
            <ErrorState error={movements.error} onRetry={movements.reload} />
          ) : !movements.data ? (
            <LoadingState />
          ) : movements.data.data.length === 0 ? (
            <EmptyState title="No stock movements yet" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.data.data.map((m, index) => {
                    const change = movementChange(m);
                    return (
                      <TableRow key={`${m.created_at}-${index}`}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell>{humanize(m.type)}</TableCell>
                        <TableCell
                          className={
                            change.reservedOnly ? "text-muted-foreground" : change.value < 0 ? "text-destructive" : "text-success"
                          }
                          title={change.reservedOnly ? "Reserved stock; on hand is unchanged" : undefined}
                        >
                          {change.value > 0 ? `+${change.value}` : change.value}
                        </TableCell>
                        <TableCell>
                          {m.on_hand_before} → {m.on_hand_after}
                        </TableCell>
                        <TableCell>
                          {m.reserved_before} → {m.reserved_after}
                        </TableCell>
                        <TableCell>{m.created_by?.name ?? "System"}</TableCell>
                        <TableCell className="max-w-48 truncate" title={m.note ?? undefined}>
                          {m.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination meta={movements.data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const FIELDS = ["type", "quantity", "note"] as const;

function AdjustForm({
  productId,
  variantId,
  onHand,
  onDone,
}: {
  productId: string;
  variantId: string;
  onHand: number;
  onDone: () => void;
}) {
  const form = useForm<MovementValues, unknown, MovementOutput>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "purchase", quantity: "", note: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });

  const submit = form.handleSubmit(async (values) => {
    try {
      await recordMovement(productId, variantId, {
        type: values.type,
        quantity: values.quantity,
        // The API refuses the movement (409) if someone changed the stock since we loaded it.
        expected_on_hand: onHand,
        note: nullable(values.note),
      });
      toast.success("Stock updated.");
      form.reset({ type: values.type, quantity: "", note: "" });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("The stock changed in the meantime. The figures have been reloaded; try again.");
        onDone();
      } else {
        handleFormError(error, form.setError, FIELDS);
      }
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-[10rem_8rem_1fr_auto] sm:items-start" noValidate>
      <Field label="Movement" htmlFor="m-type" error={errors.type?.message}>
        <NativeSelect id="m-type" {...form.register("type")}>
          <option value="purchase">Stock received</option>
          <option value="adjustment">Adjustment (±)</option>
        </NativeSelect>
      </Field>
      <Field label="Quantity" htmlFor="m-qty" error={errors.quantity?.message}>
        <Input id="m-qty" type="number" step={1} placeholder={type === "purchase" ? "10" : "-2"} aria-invalid={Boolean(errors.quantity)} {...form.register("quantity")} />
      </Field>
      <Field label={type === "adjustment" ? "Note" : "Note (optional)"} htmlFor="m-note" error={errors.note?.message}>
        <Input id="m-note" maxLength={500} aria-invalid={Boolean(errors.note)} {...form.register("note")} />
      </Field>
      <Button type="submit" className="sm:mt-5.5" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" />}
        Record
      </Button>
    </form>
  );
}
