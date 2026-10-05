import { api, apiList, openFile, type Query } from "@/lib/api/client";
import type { Store, Vendor, VendorAgreement } from "@/types/api";

export const listVendors = (query: Query & { status?: string; q?: string; page?: number; per_page?: number }) =>
  apiList<Vendor>("/admin/vendors", query);
export const getVendor = (id: string) => api<Vendor>(`/admin/vendors/${id}`);
export const revealTaxId = (id: string) => api<{ tax_id: string | null }>(`/admin/vendors/${id}/tax-id`);

export interface VendorStatusInput {
  status: "approved" | "rejected" | "suspended" | "terminated";
  reason?: string | null;
  revision?: number | null;
}

export const setVendorStatus = (id: string, body: VendorStatusInput) =>
  api<Vendor>(`/admin/vendors/${id}/status`, { method: "PUT", body });
export const resendAgreementLink = (id: string) => api<Vendor>(`/admin/vendors/${id}/agreement-link`, { method: "POST" });
export const openVendorDocument = (vendorId: string, documentId: string) =>
  openFile(`/admin/vendors/${vendorId}/documents/${documentId}`);
export const openConsentCopy = (vendorId: string, consentId: string) =>
  openFile(`/admin/vendors/${vendorId}/consents/${consentId}/copy`);

// Stores
export interface StoreInput {
  name?: string;
  slug?: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  policies?: string | null;
}

export const listStores = (
  query: Query & { status?: string; vendor_id?: string; q?: string; page?: number; per_page?: number },
) => apiList<Store>("/admin/stores", query);
export const updateStore = (id: string, body: StoreInput) => api<Store>(`/admin/stores/${id}`, { method: "PATCH", body });
export const setStoreStatus = (id: string, body: { status: "active" | "suspended"; reason?: string | null }) =>
  api<Store>(`/admin/stores/${id}/status`, { method: "PUT", body });

// Vendor agreements: each publish is a new version.
export const listAgreements = (query: Query & { page?: number; per_page?: number }) =>
  apiList<VendorAgreement>("/admin/vendor-agreements", query);
export const getAgreement = (id: string) => api<VendorAgreement>(`/admin/vendor-agreements/${id}`);
export const publishAgreement = (body: { title: string; body: string }) =>
  api<VendorAgreement>("/admin/vendor-agreements", { method: "POST", body });
