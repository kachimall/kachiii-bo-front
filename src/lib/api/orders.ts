import { api, apiList, type Query } from "@/lib/api/client";
import type { Purchase } from "@/types/api";

export interface OrderFilters extends Query {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  flagged?: boolean;
  q?: string;
  page?: number;
  per_page?: number;
}

export const listOrders = (filters: OrderFilters) => apiList<Purchase>("/admin/orders", filters);
export const getOrder = (id: string) => api<Purchase>(`/admin/orders/${id}`);
export const cancelVendorOrder = (purchaseId: string, vendorOrderId: string, reason: string) =>
  api<Purchase>(`/admin/orders/${purchaseId}/vendor-orders/${vendorOrderId}/cancel`, {
    method: "POST",
    body: { reason },
  });
