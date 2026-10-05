import { z } from "zod";

const DECIMAL = /^\d{1,7}(\.\d{1,2})?$/;
const MAX_AMOUNT = 9_999_999.99;

const amount = (message: string) => z.string().trim().regex(DECIMAL, message);
const optionalAmount = z.string().trim().refine((v) => v === "" || DECIMAL.test(v), "Enter an amount like 25 or 25.50.");
const optionalInt = z.string().trim().refine((v) => v === "" || /^\d+$/.test(v), "Enter a whole number.");

/** SaveVoucherRequest, including its cross-field rules (after()). */
export const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{4,20}$/, "Use 4 to 20 letters and digits.")
      .transform((v) => v.toUpperCase()),
    name: z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters."),
    funded_by: z.enum(["kachi", "vendor"]),
    store_id: z.string(),
    type: z.enum(["fixed", "percentage"]),
    value: amount("Enter an amount like 10 or 12.50."),
    max_discount: optionalAmount,
    min_spend: optionalAmount,
    starts_at: z.string().min(1, "Choose when the voucher starts."),
    ends_at: z.string().min(1, "Choose when the voucher ends."),
    usage_limit: optionalInt,
    usage_limit_per_buyer: z.string().trim().regex(/^\d+$/, "Enter a whole number."),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const value = Number(v.value);

    if (value <= 0 || value > MAX_AMOUNT) issue("value", "Enter an amount above 0.");
    if (v.type === "percentage" && value > 100) issue("value", "A percentage voucher takes off at most 100%.");
    if (v.max_discount !== "" && Number(v.max_discount) <= 0) issue("max_discount", "Enter an amount above 0, or leave it empty.");
    if (v.type === "fixed" && v.max_discount !== "") issue("max_discount", "Only a percentage voucher has a maximum discount.");
    if (v.funded_by === "vendor" && v.store_id === "") issue("store_id", "Choose the store whose items the voucher covers.");
    if (v.usage_limit !== "" && (Number(v.usage_limit) < 1 || Number(v.usage_limit) > 1_000_000)) {
      issue("usage_limit", "Use 1 to 1,000,000, or leave it empty for no limit.");
    }
    const perBuyer = Number(v.usage_limit_per_buyer);
    if (perBuyer < 1 || perBuyer > 100) issue("usage_limit_per_buyer", "Use 1 to 100.");
    if (v.starts_at && v.ends_at && new Date(v.ends_at) <= new Date(v.starts_at)) issue("ends_at", "The end must be after the start.");
  });

export type VoucherValues = z.input<typeof voucherSchema>;
export type VoucherOutput = z.output<typeof voucherSchema>;
