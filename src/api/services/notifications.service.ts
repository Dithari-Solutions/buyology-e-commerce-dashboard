import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  /** Wire name is `read` — Jackson serializes the entity's boolean is-getter without the prefix. */
  read: boolean;
  createdAt: string;
}

export const notificationsService = {
  getHistory(signal?: AbortSignal): Promise<ApiResponse<NotificationItem[]>> {
    return apiClient.get<ApiResponse<NotificationItem[]>>("/api/v1/notifications/history", { signal });
  },
  getUnreadCount(signal?: AbortSignal): Promise<ApiResponse<number>> {
    return apiClient.get<ApiResponse<number>>("/api/v1/notifications/unread-count", { signal });
  },
  markRead(id: string): Promise<ApiResponse<void>> {
    return apiClient.put<ApiResponse<void>>(`/api/v1/notifications/history/${id}/read`);
  },
  markAllRead(): Promise<ApiResponse<number>> {
    return apiClient.put<ApiResponse<number>>(`/api/v1/notifications/history/read-all`);
  },
};

/** Where a notification type leads when clicked — the feed is a to-do list, not a log. */
export function notificationRoute(type: string): string | null {
  switch (type) {
    case "NEW_ORDER":
    case "ORDER_ATTENTION":
    case "ORDER_CANCELLED":
      return "/orders/all";
    case "REPAIR_REQUEST":
      return "/repair";
    case "SUPPORT_REQUEST":
      return "/support";
    case "SELL_REQUEST":
      return "/procurement/sell-requests";
    default:
      return null;
  }
}
