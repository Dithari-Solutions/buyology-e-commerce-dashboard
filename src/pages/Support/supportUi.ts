import type { SupportCategory, SupportTicketStatus } from "../../api/services/support.service";

/** Human labels for each ticket status (shared by the list + detail pages). */
export const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_CUSTOMER: "Waiting for customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  WAITING_FOR_CUSTOMER: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  SOFTWARE_BUG: "Website bug",
  ORDER_ISSUE: "Order issue",
  PAYMENT_ISSUE: "Payment issue",
  ACCOUNT_ISSUE: "Account issue",
  OTHER: "Other",
};

/** Statuses an admin can move a ticket to directly (replying moves OPEN → IN_PROGRESS itself). */
export const STATUS_OPTIONS: SupportTicketStatus[] = [
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export const ALL_STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
