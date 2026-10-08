import { api, apiList, downloadFile, type Query } from "@/lib/api/client";
import type { AuditLogEntry, Dashboard, Report, ReportKey } from "@/types/api";

/** UAE days, YYYY-MM-DD; the API takes the last 30 days when left out, and a year at most. */
export interface Period {
  from?: string;
  to?: string;
}

/** The figures over the period; each is null for staff who cannot view its section (cached 5 minutes). */
export const getDashboard = (period: Period) => api<Dashboard>("/admin/dashboard", { query: { ...period } });

export interface ReportOptions extends Period {
  /** Only for reports that group their rows (see REPORTS[].groupings). */
  group_by?: string;
  /** Best sellers only: 1–100 (20 by default). */
  limit?: number;
}

export interface ReportInfo {
  key: ReportKey;
  name: string;
  description: string;
  /** What the rows can be grouped by; the first is the default. Empty: not grouped. */
  groupings: string[];
}

// ReportType::groupings() and label(); ReportRequest refuses group_by/limit where they do not apply.
export const REPORTS: ReportInfo[] = [
  {
    key: "sales",
    name: "Sales",
    description: "Orders, units and sales of the stores' orders placed in the period.",
    groupings: ["store", "category", "day", "week", "month"],
  },
  {
    key: "commissions",
    name: "Commissions earned",
    description: "KACHI's commission on sales, less what it gave back on returns.",
    groupings: ["store", "day", "week", "month"],
  },
  {
    key: "best-sellers",
    name: "Best-selling products",
    description: "The products that sold the most units in the period.",
    groupings: [],
  },
  {
    key: "payouts",
    name: "Payouts due and released",
    description: "Payouts to stores, and what noqodi and KACHI have paid or still owe.",
    groupings: ["store", "week", "month"],
  },
  {
    key: "vouchers",
    name: "Voucher usage",
    description: "How often each voucher was used and the discount it gave.",
    groupings: [],
  },
  {
    key: "ad-sales",
    name: "Ad sales",
    description: "Ads the stores paid for, and what they paid.",
    groupings: ["placement", "store", "day", "week", "month"],
  },
  {
    key: "cash-on-delivery",
    name: "Cash on delivery",
    description: "Cash collected by Zajel, what it has remitted, and the stores' shares.",
    groupings: ["store", "day", "week", "month"],
  },
];

function reportQuery(key: ReportKey, options: ReportOptions): Query {
  const info = REPORTS.find((r) => r.key === key);
  return {
    from: options.from,
    to: options.to,
    group_by: info && info.groupings.length > 0 ? options.group_by : undefined,
    limit: key === "best-sellers" ? options.limit : undefined,
  };
}

export const getReport = (key: ReportKey, options: ReportOptions) =>
  api<Report>(`/admin/reports/${key}`, { query: reportQuery(key, options) });

/** The same report as a CSV file (UTF-8, ending with a totals row). */
export const exportReport = (key: ReportKey, options: ReportOptions & { from: string; to: string }) =>
  downloadFile(`/admin/reports/${key}/export`, reportQuery(key, options), `${key}-${options.from}-to-${options.to}.csv`);

// The audit log: the Super Admin's alone (audit-logs.view). Newest first, 30 a page.
export interface AuditLogQuery extends Query {
  log?: string;
  /** An exact event, e.g. "auth.login". */
  event?: string;
  /** Whoever did it (a user's id). */
  user_id?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export const AUDIT_LOGS = [
  "auth",
  "accounts",
  "vendors",
  "catalog",
  "inventory",
  "orders",
  "finance",
  "content",
  "ads",
  "messages",
  "settings",
] as const;

export const listAuditLogs = (query: AuditLogQuery) => apiList<AuditLogEntry>("/admin/audit-logs", query);
