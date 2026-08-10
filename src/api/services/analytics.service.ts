import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

/**
 * Website traffic counters, recorded first-party by the storefront beacon
 * (POST /api/analytics/visit) rather than read out of Google Analytics.
 */
export interface VisitorWindow {
  /** Distinct browsers — a shopper returning next week still counts once. */
  uniqueVisitors: number;
  /** Distinct browsing sessions — the "general" visitor count, repeats included. */
  visits: number;
  pageViews: number;
}

export interface VisitorDailyPoint {
  /** ISO date (yyyy-MM-dd), bucketed on the Asia/Dubai business day. */
  date: string;
  uniqueVisitors: number;
  visits: number;
  pageViews: number;
}

export interface VisitorMetricsResponse {
  allTime: VisitorWindow;
  today: VisitorWindow;
  last7Days: VisitorWindow;
  last30Days: VisitorWindow;
  /** The seven days before `last7Days`, for the trend badge. */
  previous7Days: VisitorWindow;
  /** Visitors seen in the last few minutes. */
  activeNow: number;
  days: number;
  /** One point per day, gap-filled with zeros. */
  daily: VisitorDailyPoint[];
}

export const analyticsService = {
  /** @param days length of the daily trend series (1-180, clamped server-side) */
  getVisitorMetrics(days = 30, signal?: AbortSignal): Promise<ApiResponse<VisitorMetricsResponse>> {
    return apiClient.get<ApiResponse<VisitorMetricsResponse>>(
      `/api/admin/analytics/visitors?days=${days}`,
      { signal }
    );
  },
};
