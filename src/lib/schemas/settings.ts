import { z } from "zod";

const DECIMAL = /^\d{1,7}(\.\d{1,2})?$/;
const int = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number.")
    .refine((v) => Number(v) >= min && Number(v) <= max, message);
const money = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(DECIMAL, "Enter an amount like 15 or 15.50.")
    .refine((v) => Number(v) >= min && Number(v) <= max, message);

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Keep it under 254 characters.")
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.");

/** UpdateSettingsRequest */
export const settingsSchema = z.object({
  unpaid_order_minutes: int(5, 1440, "Use 5 to 1440 minutes."),
  ship_deadline_days: int(1, 30, "Use 1 to 30 days."),
  cash_on_delivery_enabled: z.boolean(),
  cash_on_delivery_max_total: money(1, 9_999_999.99, "Use at least AED 1."),
  cod_refusal_limit: int(1, 10, "Use 1 to 10 parcels."),
  return_days: int(1, 90, "Use 1 to 90 days."),
  return_reply_days: int(1, 14, "Use 1 to 14 days."),
  return_dispute_days: int(1, 30, "Use 1 to 30 days."),
  delivery_fee_mode: z.enum(["courier", "flat"]),
  delivery_flat_fee: money(0, 9999.99, "Use AED 0 to 9,999.99."),
  free_delivery_min_total: z
    .string()
    .trim()
    .refine((v) => v === "" || (DECIMAL.test(v) && Number(v) > 0), "Enter an amount, or leave it empty to turn free delivery off."),
  online_payment_enabled: z.boolean(),
  store_name: z.string().trim().min(2, "Use 2 to 80 characters.").max(80, "Use 2 to 80 characters."),
  legal_name: z.string().trim().max(150, "Keep it under 150 characters."),
  address: z.string().trim().max(300, "Keep it under 300 characters."),
  trn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{15}$/.test(v), "A TRN is 15 digits."),
  support_email: optionalEmail,
  support_phone: z.string().trim().max(20, "Enter a UAE phone number."),
  vat_rate: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a rate like 5 or 5.25.")
    .refine((v) => Number(v) <= 100, "Use 0 to 100 percent."),
  email_reply_to: optionalEmail,
}).refine((v) => v.online_payment_enabled || v.cash_on_delivery_enabled, {
  path: ["online_payment_enabled"],
  message: "Keep at least one way to pay switched on.",
});

export type SettingsValues = z.infer<typeof settingsSchema>;

/** PayoutSettingsController::update */
export const payoutSettingsSchema = z.object({
  payout_hold_days: int(0, 30, "Use 0 to 30 days."),
});

export type PayoutSettingsValues = z.infer<typeof payoutSettingsSchema>;
