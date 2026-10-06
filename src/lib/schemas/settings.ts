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
});

export type SettingsValues = z.infer<typeof settingsSchema>;

/** PayoutSettingsController::update */
export const payoutSettingsSchema = z.object({
  payout_hold_days: int(0, 30, "Use 0 to 30 days."),
});

export type PayoutSettingsValues = z.infer<typeof payoutSettingsSchema>;
