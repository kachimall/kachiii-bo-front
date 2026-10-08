import { api, apiList, apiWithMeta, type Query } from "@/lib/api/client";
import type {
  CodPackage,
  CodRemittance,
  CommissionRates,
  EarningsSummary,
  LedgerEntry,
  LedgerEntryStatus,
  PageMeta,
  PaymentMethod,
  PayoutSettings,
  Refund,
  RefundStatus,
} from "@/types/api";

/** meta.total_amount is what the refunds listed add up to (all pages). */
export const listRefunds = (
  query: Query & { status?: RefundStatus | ""; payment_method?: PaymentMethod | ""; page?: number; per_page?: number },
) => apiWithMeta<Refund[], PageMeta & { total_amount?: string }>("/admin/refunds", { query });
/** Another try for a refund the gateway refused (409 unless failed). */
export const retryRefund = (id: string) => api<Refund>(`/admin/refunds/${id}/retry`, { method: "POST" });
/**
 * Records that KACHI paid a cash-on-delivery refund back itself (DECISIONS FN9), with its reference
 * (e.g. the bank transfer's). paid_at (ISO, not in the future) defaults to now. 409 unless it is a
 * cash-on-delivery refund still owed.
 */
export const recordRefundPayment = (id: string, body: { reference: string; paid_at?: string | null }) =>
  api<Refund>(`/admin/refunds/${id}/kachi-payment`, { method: "POST", body });

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

// Vendor earnings (DECISIONS FN6), payouts.view. The ledger is newest first.
export const getVendorEarningsSummary = (vendorId: string) =>
  api<EarningsSummary>(`/admin/vendors/${vendorId}/earnings/summary`);
export const listVendorEarnings = (
  vendorId: string,
  query: Query & { status?: LedgerEntryStatus | ""; payment_method?: PaymentMethod | ""; page?: number; per_page?: number },
) => apiList<LedgerEntry>(`/admin/vendors/${vendorId}/earnings`, query);

// Payout rules: viewing needs payouts.view, changing payouts.manage.
export const getPayoutSettings = () => api<PayoutSettings>("/admin/payout-settings");
export const updatePayoutSettings = (body: PayoutSettings) =>
  api<PayoutSettings>("/admin/payout-settings", { method: "PATCH", body });

// Cash on delivery from Zajel (DECISIONS FN8): payments.view sees what Zajel holds and its
// transfers; payments.manage records a transfer.
/** Collected longest ago first; meta.outstanding_amount is the total Zajel still holds. */
export const listCodOutstanding = (query: Query & { page?: number; per_page?: number }) =>
  apiWithMeta<CodPackage[], PageMeta & { outstanding_amount?: string }>("/admin/cod/outstanding", { query });
export const listCodRemittances = (query: Query & { page?: number; per_page?: number }) =>
  apiList<CodRemittance>("/admin/cod/remittances", query);
export const getCodRemittance = (id: string) => api<CodRemittance>(`/admin/cod/remittances/${id}`);

export interface CodRemittanceInput {
  /** Zajel's reference, unique. */
  reference: string;
  /** ISO with an offset, not in the future. */
  remitted_at: string;
  /** What reached KACHI, at most what the packages collected; the rest is Zajel's fee. */
  amount: string;
  /** The packages' ids (each collected and not remitted yet), 1–500. */
  packages: string[];
  note?: string | null;
}

export const createCodRemittance = (body: CodRemittanceInput) =>
  api<CodRemittance>("/admin/cod/remittances", { method: "POST", body });
