import { api, apiList, openFile, type Query } from "@/lib/api/client";
import type { CourierStatus, Purchase } from "@/types/api";

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

/** The courier's waybill PDF for a booked package (409 until booked). */
export const openWaybill = (purchaseId: string, packageId: string) =>
  openFile(`/admin/orders/${purchaseId}/packages/${packageId}/waybill`);

/**
 * Plays the courier while the backend runs its mock Zajel (404 in production or with a real courier),
 * e.g. {"status": "returned", "reason": "refused"} for a parcel refused at the door.
 */
export const sendCourierUpdate = (purchaseId: string, packageId: string, status: CourierStatus, reason?: string) =>
  api<Purchase>(`/admin/orders/${purchaseId}/packages/${packageId}/courier-update`, {
    method: "POST",
    body: { status, reason: reason || undefined },
  });
