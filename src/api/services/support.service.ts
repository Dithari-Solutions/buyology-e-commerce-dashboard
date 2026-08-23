import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { SpringPage } from "./refunds.service";

const BASE = "/api/admin/support-tickets";

/** Ticket lifecycle (mirrors backend SupportTicketStatus enum). */
export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

/** What the customer needs help with (mirrors backend SupportCategory enum). */
export type SupportCategory =
  | "SOFTWARE_BUG"
  | "ORDER_ISSUE"
  | "PAYMENT_ISSUE"
  | "ACCOUNT_ISSUE"
  | "OTHER";

/** One conversation entry (mirrors backend SupportMessageResponse). */
export interface SupportMessage {
  id: string;
  author: "CUSTOMER" | "ADMIN";
  body: string;
  createdAt?: string | null;
}

/** A support ticket (mirrors backend SupportTicketResponse). */
export interface SupportTicket {
  id: string;
  reference?: string | null;
  category?: SupportCategory | null;
  subject: string;
  description: string;
  /** Where the customer got stuck — the page URL, optional. */
  pageUrl?: string | null;
  status: SupportTicketStatus;
  adminNote?: string | null;
  contactEmail?: string | null;
  adminUnread: boolean;
  customerUnread: boolean;
  /** Presigned GET urls — backend converts stored screenshot keys on read. */
  imageUrls?: string[] | null;
  /** Only present on detail reads; null on lists. */
  messages?: SupportMessage[] | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /count. */
export interface SupportCount {
  newCount: number;
}

export const supportService = {
  // GET /api/admin/support-tickets?status=&page=&size=
  list(
    params: { status?: SupportTicketStatus | ""; page?: number; size?: number },
    signal?: AbortSignal,
  ): Promise<ApiResponse<SpringPage<SupportTicket>>> {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 20));
    return apiClient.get<ApiResponse<SpringPage<SupportTicket>>>(`${BASE}?${search}`, { signal });
  },

  // GET /api/admin/support-tickets/{id}  (also clears the unread flag server-side)
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<SupportTicket>> {
    return apiClient.get<ApiResponse<SupportTicket>>(`${BASE}/${id}`, { signal });
  },

  // PATCH /api/admin/support-tickets/{id}/status  body { status, note? } — emails the customer
  updateStatus(
    id: string,
    status: SupportTicketStatus,
    note?: string,
  ): Promise<ApiResponse<SupportTicket>> {
    return apiClient.patch<ApiResponse<SupportTicket>>(`${BASE}/${id}/status`, { status, note });
  },

  // POST /api/admin/support-tickets/{id}/reply  body { body } — emails the customer
  reply(id: string, body: string): Promise<ApiResponse<SupportTicket>> {
    return apiClient.post<ApiResponse<SupportTicket>>(`${BASE}/${id}/reply`, { body });
  },

  // GET /api/admin/support-tickets/count  → { newCount }
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<SupportCount>> {
    return apiClient.get<ApiResponse<SupportCount>>(`${BASE}/count`, { signal });
  },
};
