import { api, apiList, openFile, type Query } from "@/lib/api/client";
import type { CourierStatus, Purchase, Refund, RefundCharge } from "@/types/api";

/**
 * Whether to offer the courier-update actions that play Zajel. The backend only runs its mock
 * courier outside production (404 otherwise): on by default in development, and on a production
 * build only with NEXT_PUBLIC_MOCK_COURIER=true (e.g. the test server).
 */
export const MOCK_COURIER =
  process.env.NEXT_PUBLIC_MOCK_COURIER === "true" ||
  (process.env.NEXT_PUBLIC_MOCK_COURIER !== "false" && process.env.NODE_ENV !== "production");

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

/**
 * A package the courier brought back undelivered is back with its sender: its items go back on
 * sale unless restock is false, and a buyer who paid online is refunded for them. 409 unless returned.
 */
export const receivePackageBack = (purchaseId: string, packageId: string, restock: boolean) =>
  api<Purchase>(`/admin/orders/${purchaseId}/packages/${packageId}/received-back`, {
    method: "POST",
    body: { restock },
  });

export interface RefundInput {
  /** "50.00": up to what is left of the online payment. */
  amount: string;
  reason: string;
  /** The store's order refunded; required when its vendor bears it. */
  order_id?: string;
  charged_to: RefundCharge;
}

/** Refunds part of an order paid online (409 for cash on delivery, refunded outside the platform). */
export const issueRefund = (purchaseId: string, body: RefundInput) =>
  api<Refund>(`/admin/orders/${purchaseId}/refunds`, { method: "POST", body });
