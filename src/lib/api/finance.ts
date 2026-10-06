import { api, apiList, type Query } from "@/lib/api/client";
import type { CommissionRates, Refund, RefundStatus } from "@/types/api";

export const listRefunds = (query: Query & { status?: RefundStatus | ""; page?: number; per_page?: number }) =>
  apiList<Refund>("/admin/refunds", query);
/** Another try for a refund the gateway refused (409 unless failed). */
export const retryRefund = (id: string) => api<Refund>(`/admin/refunds/${id}/retry`, { method: "POST" });

// Commission rates, in percent ("10.00"). A vendor's rate wins over its category's, a category's
// over the default; orders keep the rate they were placed at. Every change answers with all rates.
export const getCommissionRates = () => api<CommissionRates>("/admin/commission-rates");
export const setDefaultCommission = (rate: string) =>
  api<CommissionRates>("/admin/commission-rates", { method: "PATCH", body: { rate } });
/** null removes the category's own rate (it and its subcategories fall back to their parent or the default). */
export const setCategoryCommission = (categoryId: string, rate: string | null) =>
  api<CommissionRates>(`/admin/categories/${categoryId}/commission`, { method: "PUT", body: { rate } });
/** null removes the vendor's own rate. */
export const setVendorCommission = (vendorId: string, rate: string | null) =>
  api<CommissionRates>(`/admin/vendors/${vendorId}/commission`, { method: "PUT", body: { rate } });
