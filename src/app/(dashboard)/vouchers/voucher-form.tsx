"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useStoreOptions } from "@/hooks/use-options";
import { createVoucher, updateVoucher, type VoucherInput } from "@/lib/api/vouchers";
import { fromUaeInput, toUaeInput } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { voucherSchema, type VoucherOutput, type VoucherValues } from "@/lib/schemas/vouchers";
import { useCan } from "@/store/auth";
import type { Voucher } from "@/types/api";

const FIELDS = [
  "code",
  "name",
  "funded_by",
  "store_id",
  "type",
  "value",
  "max_discount",
  "min_spend",
  "starts_at",
  "ends_at",
  "usage_limit",
  "usage_limit_per_buyer",
  "is_active",
] as const;

function defaults(voucher?: Voucher): VoucherValues {
  return {
    code: voucher?.code ?? "",
    name: voucher?.name ?? "",
    funded_by: voucher?.funded_by ?? "kachi",
    store_id: voucher?.store?.id ?? "",
    type: voucher?.type ?? "percentage",
    value: voucher?.value ?? "",
    max_discount: voucher?.max_discount ?? "",
    min_spend: voucher?.min_spend ?? "0",
    starts_at: toUaeInput(voucher?.starts_at),
    ends_at: toUaeInput(voucher?.ends_at),
    usage_limit: voucher?.usage_limit?.toString() ?? "",
    usage_limit_per_buyer: voucher?.usage_limit_per_buyer.toString() ?? "1",
    is_active: voucher?.is_active ?? true,
  };
}

function toInput(v: VoucherOutput): VoucherInput {
  return {
    code: v.code,
    name: v.name,
    funded_by: v.funded_by,
    store_id: v.funded_by === "vendor" ? v.store_id : null,
    type: v.type,
    value: Number(v.value),
    max_discount: v.type === "percentage" && v.max_discount !== "" ? Number(v.max_discount) : null,
    min_spend: v.min_spend === "" ? 0 : Number(v.min_spend),
    // UAE time with its offset: the API converts it to UTC (SaveVoucherRequest).
    starts_at: fromUaeInput(v.starts_at),
    ends_at: fromUaeInput(v.ends_at),
    usage_limit: v.usage_limit === "" ? null : Number(v.usage_limit),
    usage_limit_per_buyer: Number(v.usage_limit_per_buyer),
    is_active: v.is_active,
  };
}

export function VoucherForm({ voucher, onSaved }: { voucher?: Voucher; onSaved?: (voucher: Voucher) => void }) {
  const router = useRouter();
  const can = useCan();
  const readOnly = !can("promotions.manage");
  const stores = useStoreOptions(can("vendors.view"));
  const form = useForm<VoucherValues, unknown, VoucherOutput>({ resolver: zodResolver(voucherSchema), defaultValues: defaults(voucher) });
  const { errors, isSubmitting } = form.formState;
  const fundedBy = useWatch({ control: form.control, name: "funded_by" });
  const type = useWatch({ control: form.control, name: "type" });

  const submit = form.handleSubmit(async (values) => {
    try {
      const body = toInput(values);
      if (voucher) {
        const saved = await updateVoucher(voucher.id, body);
        form.reset(defaults(saved));
        onSaved?.(saved);
        toast.success("Voucher saved.");
      } else {
        const saved = await createVoucher(body);
        toast.success("Voucher created.");
        router.replace(`/vouchers/${saved.id}`);
      }
    } catch (error) {
      handleFormError(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <fieldset disabled={readOnly || isSubmitting} className="grid gap-6 lg:grid-cols-2">
        <Section title="Voucher">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" htmlFor="v-code" error={errors.code?.message} hint="4–20 letters and digits; saved in capitals.">
                <Input id="v-code" className="font-mono uppercase" maxLength={20} aria-invalid={Boolean(errors.code)} {...form.register("code")} />
              </Field>
              <Field label="Name" htmlFor="v-name" error={errors.name?.message} hint="Shown to buyers.">
                <Input id="v-name" maxLength={100} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Funded by" htmlFor="v-funded" error={errors.funded_by?.message} hint={fundedBy === "kachi" ? "KACHI pays; valid in every store." : "The vendor pays; valid on its store's items."}>
                <NativeSelect id="v-funded" {...form.register("funded_by")}>
                  <option value="kachi">KACHI</option>
                  <option value="vendor">A vendor (store voucher)</option>
                </NativeSelect>
              </Field>
              {fundedBy === "vendor" && (
                <Field label="Store" htmlFor="v-store" error={errors.store_id?.message}>
                  {stores.length > 0 || voucher?.store ? (
                    <NativeSelect id="v-store" aria-invalid={Boolean(errors.store_id)} {...form.register("store_id")}>
                      <option value="">Choose a store</option>
                      {voucher?.store && !stores.some((s) => s.value === voucher.store?.id) && (
                        <option value={voucher.store.id}>{voucher.store.name}</option>
                      )}
                      {stores.map((store) => (
                        <option key={store.value} value={store.value}>
                          {store.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Input id="v-store" placeholder="Store ID" aria-invalid={Boolean(errors.store_id)} {...form.register("store_id")} />
                  )}
                </Field>
              )}
            </div>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Label className="font-normal">
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} />
                  Active (can be used while it runs)
                </Label>
              )}
            />
          </div>
        </Section>

        <Section title="Discount">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="v-type" error={errors.type?.message}>
                <NativeSelect id="v-type" {...form.register("type")}>
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </NativeSelect>
              </Field>
              <Field label={type === "percentage" ? "Percent off" : "Amount off (AED)"} htmlFor="v-value" error={errors.value?.message}>
                <Input id="v-value" inputMode="decimal" aria-invalid={Boolean(errors.value)} {...form.register("value")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {type === "percentage" && (
                <Field label="Maximum discount (AED)" htmlFor="v-max" error={errors.max_discount?.message} hint="Optional cap.">
                  <Input id="v-max" inputMode="decimal" aria-invalid={Boolean(errors.max_discount)} {...form.register("max_discount")} />
                </Field>
              )}
              <Field label="Minimum spend (AED)" htmlFor="v-min" error={errors.min_spend?.message}>
                <Input id="v-min" inputMode="decimal" aria-invalid={Boolean(errors.min_spend)} {...form.register("min_spend")} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="When and how often">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="v-start" error={errors.starts_at?.message}>
                <Input id="v-start" type="datetime-local" aria-invalid={Boolean(errors.starts_at)} {...form.register("starts_at")} />
              </Field>
              <Field label="Ends" htmlFor="v-end" error={errors.ends_at?.message}>
                <Input id="v-end" type="datetime-local" aria-invalid={Boolean(errors.ends_at)} {...form.register("ends_at")} />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">Times are in UAE time (GMT+4).</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total uses" htmlFor="v-limit" error={errors.usage_limit?.message} hint="Leave empty for no limit.">
                <Input id="v-limit" inputMode="numeric" aria-invalid={Boolean(errors.usage_limit)} {...form.register("usage_limit")} />
              </Field>
              <Field label="Uses per buyer" htmlFor="v-per-buyer" error={errors.usage_limit_per_buyer?.message}>
                <Input id="v-per-buyer" inputMode="numeric" aria-invalid={Boolean(errors.usage_limit_per_buyer)} {...form.register("usage_limit_per_buyer")} />
              </Field>
            </div>
          </div>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <ButtonLink href="/vouchers">Cancel</ButtonLink>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {voucher ? "Save changes" : "Create voucher"}
          </Button>
        </div>
      )}
    </form>
  );
}
