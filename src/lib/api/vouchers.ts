import { api, apiList, type Query } from "@/lib/api/client";
import type { Voucher, VoucherFunder, VoucherType } from "@/types/api";

export interface VoucherInput {
  code: string;
  name: string;
  funded_by: VoucherFunder;
  store_id?: string | null;
  type: VoucherType;
  value: number;
  max_discount?: number | null;
  min_spend?: number;
  starts_at: string;
  ends_at: string;
  usage_limit?: number | null;
  usage_limit_per_buyer?: number;
  is_active?: boolean;
}

export const listVouchers = (query: Query & { q?: string; page?: number; per_page?: number }) =>
  apiList<Voucher>("/admin/vouchers", query);
export const getVoucher = (id: string) => api<Voucher>(`/admin/vouchers/${id}`);
export const createVoucher = (body: VoucherInput) => api<Voucher>("/admin/vouchers", { method: "POST", body });
export const updateVoucher = (id: string, body: Partial<VoucherInput>) =>
  api<Voucher>(`/admin/vouchers/${id}`, { method: "PATCH", body });
export const deleteVoucher = (id: string) => api<null>(`/admin/vouchers/${id}`, { method: "DELETE" });
