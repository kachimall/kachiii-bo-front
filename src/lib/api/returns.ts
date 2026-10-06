import { api, apiList, fetchBlob, type Query } from "@/lib/api/client";
import type { CourierStatus, ReturnDecision, ReturnRequest, ReturnStatus } from "@/types/api";

export interface ReturnFilters extends Query {
  status?: ReturnStatus | "";
  /** A return number (RT-0000001), or an order's (KO-0000001, or a store's KO-0000001-2). */
  q?: string;
  page?: number;
  per_page?: number;
}

export const listReturns = (filters: ReturnFilters) => apiList<ReturnRequest>("/admin/returns", filters);
export const getReturn = (id: string) => api<ReturnRequest>(`/admin/returns/${id}`);

/** One of the buyer's photos (WebP), numbered from 1; it needs the bearer token, so it comes as a blob. */
export const getReturnPhoto = (id: string, number: number, signal?: AbortSignal) =>
  fetchBlob(`/admin/returns/${id}/photos/${number}`, signal);

/** KACHI's final decision on an escalated return; the buyer and the store are emailed. 409 unless escalated. */
export const decideReturn = (id: string, decision: ReturnDecision, remarks: string) =>
  api<ReturnRequest>(`/admin/returns/${id}/decide`, { method: "POST", body: { decision, remarks } });

/** The items are back: they go back on sale unless restock is false, and the buyer is refunded. */
export const receiveReturn = (id: string, restock: boolean) =>
  api<ReturnRequest>(`/admin/returns/${id}/receive`, { method: "POST", body: { restock } });

/** Plays the courier on a return's pickup while the backend runs its mock Zajel (404 otherwise). */
export const sendReturnCourierUpdate = (id: string, status: CourierStatus, reason?: string) =>
  api<ReturnRequest>(`/admin/returns/${id}/courier-update`, {
    method: "POST",
    body: { status, reason: reason || undefined },
  });
