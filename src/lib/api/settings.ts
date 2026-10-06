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
}

export const getSettings = () => api<Settings>("/admin/settings");
export const updateSettings = (body: SettingsInput) => api<Settings>("/admin/settings", { method: "PATCH", body });
