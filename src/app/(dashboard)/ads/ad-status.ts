import type { AdStatus } from "@/types/api";

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  pending_approval: "Waiting for approval",
  approved: "Approved, awaiting payment",
  live: "Live",
  ended: "Ended",
  rejected: "Rejected",
  cancelled: "Cancelled by the store",
  expired: "Not paid in time",
  stopped: "Stopped by staff",
};

export const AD_STATUS_TONES: Record<AdStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending_approval: "warning",
  approved: "info",
  live: "success",
  ended: "neutral",
  rejected: "danger",
  cancelled: "neutral",
  expired: "neutral",
  stopped: "danger",
};
