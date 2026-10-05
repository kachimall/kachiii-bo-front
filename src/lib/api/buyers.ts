import { api, apiList, type Query } from "@/lib/api/client";
import type { Buyer } from "@/types/api";

export const listBuyers = (query: Query & { status?: string; q?: string; page?: number; per_page?: number }) =>
  apiList<Buyer>("/admin/buyers", query);
export const getBuyer = (id: string) => api<Buyer>(`/admin/buyers/${id}`);
export const setBuyerStatus = (id: string, status: "active" | "suspended") =>
  api<Buyer>(`/admin/buyers/${id}/status`, { method: "PUT", body: { status } });
export const sendBuyerPasswordReset = (id: string) => api<null>(`/admin/buyers/${id}/password-reset`, { method: "POST" });
