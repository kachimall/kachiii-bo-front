import { api, apiList, type Query } from "@/lib/api/client";
import type { Ad, AdPlacementKey, AdPlacementTerms, AdStatus } from "@/types/api";

// Vendor ads (DECISIONS AD1): ads.view lists the placements and the ads, ads.manage changes a
// placement's terms and approves, rejects or stops an ad.
export const listAdPlacements = () => api<AdPlacementTerms[]>("/admin/ad-placements");
/** Send only the terms to change; ads booked before keep their price. */
export const updateAdPlacement = (
  key: AdPlacementKey,
  body: Partial<{ weekly_price: string; shown_at_once: number; is_active: boolean }>,
) => api<AdPlacementTerms>(`/admin/ad-placements/${key}`, { method: "PATCH", body });

export const listAds = (
  query: Query & { status?: AdStatus | ""; placement?: AdPlacementKey | ""; store_id?: string; page?: number; per_page?: number },
) => apiList<Ad>("/admin/ads", query);
export const getAd = (id: string) => api<Ad>(`/admin/ads/${id}`);
/** The store then has 7 days to pay to start it (emailed). 409 unless it waits for approval. */
export const approveAd = (id: string) => api<Ad>(`/admin/ads/${id}/approve`, { method: "POST" });
/** The reason (up to 500 characters) is emailed to the store. */
export const rejectAd = (id: string, reason: string) =>
  api<Ad>(`/admin/ads/${id}/reject`, { method: "POST", body: { reason } });
/** Stops an approved or live ad; a paid ad is not refunded automatically. */
export const stopAd = (id: string, reason: string) => api<Ad>(`/admin/ads/${id}/stop`, { method: "POST", body: { reason } });
