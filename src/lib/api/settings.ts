import { api } from "@/lib/api/client";
import type { Settings } from "@/types/api";

export interface SettingsInput {
  unpaid_order_minutes?: number;
  ship_deadline_days?: number;
  cash_on_delivery_enabled?: boolean;
  cash_on_delivery_max_total?: number;
  delivery_fee_mode?: "courier" | "flat";
  delivery_flat_fee?: number;
  free_delivery_min_total?: number | null;
  cod_refusal_limit?: number;
  return_days?: number;
  return_reply_days?: number;
  return_dispute_days?: number;
  /** KACHI's trading name (2–80), on receipts and as its emails' sender. */
  store_name?: string;
  legal_name?: string | null;
  address?: string | null;
  /** 15 digits. */
  trn?: string | null;
  support_email?: string | null;
  /** A UAE number; the API normalises it. */
  support_phone?: string | null;
  /** In percent, up to two decimals (0–100). */
  vat_rate?: string;
  /** At least one of online payment and cash on delivery stays on (422 otherwise). */
  online_payment_enabled?: boolean;
  /** null: replies go nowhere. */
  email_reply_to?: string | null;
}

export const getSettings = () => api<Settings>("/admin/settings");
export const updateSettings = (body: SettingsInput) => api<Settings>("/admin/settings", { method: "PATCH", body });
