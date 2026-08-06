import type { DeviceCondition, SellStatus } from "../../api/services/sell.service";

/** Human labels for each sell-request status (shared by the list + detail pages). */
export const SELL_STATUS_LABELS: Record<SellStatus, string> = {
  SUBMITTED: "Submitted",
  AWAITING_DEVICE: "Awaiting device",
  UNDER_REVIEW: "Under inspection",
  OFFER_MADE: "Waiting for customer approval",
  ACCEPTED: "Accepted — awaiting payout",
  COMPLETED: "Paid",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const SELL_STATUS_COLORS: Record<SellStatus, string> = {
  SUBMITTED: "bg-brand-100 text-brand-700",
  AWAITING_DEVICE: "bg-indigo-100 text-indigo-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  OFFER_MADE: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-teal-100 text-teal-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const SELL_DELIVERY_LABELS: Record<string, string> = {
  COURIER_PICKUP: "Courier pickup",
  STORE_DROPOFF: "Store drop-off",
  COURIER_RETURN: "Courier return",
  STORE_PICKUP: "Store pickup",
};

export const CONDITION_LABELS: Record<DeviceCondition, string> = {
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const CONDITION_OPTIONS: DeviceCondition[] = ["LIKE_NEW", "GOOD", "FAIR", "POOR"];

export const PAYOUT_LABELS: Record<string, string> = {
  STORE_CASH: "Collect at store",
  WALLET_CREDIT: "Buyology wallet",
};

/** Statuses procurement can move a request to directly (special transitions have dedicated buttons). */
export const SELL_STATUS_OPTIONS: SellStatus[] = ["COMPLETED", "CANCELLED"];

export function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "—";
  return `${(currency ?? "AED").toUpperCase()} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
