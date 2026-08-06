import type { RepairStatus } from "../../api/services/repair.service";

/** Human labels for each repair status (shared by the list + detail pages). */
export const STATUS_LABELS: Record<RepairStatus, string> = {
  SUBMITTED: "Submitted",
  AWAITING_DEVICE: "Awaiting device",
  UNDER_REVIEW: "Under review",
  PRICE_ESTIMATED: "Waiting for customer approval",
  IN_REPAIR: "In repair",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  SUBMITTED: "bg-brand-100 text-brand-700",
  AWAITING_DEVICE: "bg-indigo-100 text-indigo-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  PRICE_ESTIMATED: "bg-amber-100 text-amber-700",
  IN_REPAIR: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const DELIVERY_LABELS: Record<string, string> = {
  COURIER_PICKUP: "Courier pickup",
  STORE_DROPOFF: "Store drop-off",
  COURIER_RETURN: "Courier return",
  STORE_PICKUP: "Store pickup",
};

/** Statuses an admin can move a request to directly (special transitions have dedicated buttons). */
export const STATUS_OPTIONS: RepairStatus[] = ["IN_REPAIR", "COMPLETED", "CANCELLED"];

export function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "—";
  return `${(currency ?? "AED").toUpperCase()} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
