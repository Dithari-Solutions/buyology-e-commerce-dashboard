import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

// ── Types (mirror backend enums + DTOs) ──────────────────────────────────────

export type RefundRequestStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "DROPOFF_SELECTED"
  | "COURIER_REQUESTED"
  | "RECEIVED"
  | "REJECTED"
  | "PAID"
  | "FAILED";

export type RefundReturnMethod = "STORE_DROPOFF" | "COURIER_PICKUP";

export interface RefundSetting {
  id: string;
  refundWindowDays: number;
  courierFeeAed: number;
  courierFeeCurrency: string;
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UpdateRefundSettingPayload {
  refundWindowDays: number;
  courierFeeAed: number;
  enabled?: boolean;
}

export interface RefundRequestDetail {
  id: string;
  orderId: string;
  userId: string;
  description: string;
  imageUrls: string[];
  status: RefundRequestStatus;
  returnMethod: RefundReturnMethod | null;
  courierFeeAmount: number | null;
  courierFeeCurrency: string | null;
  refundAmount: number;
  refundCurrency: string;
  adminNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  paidAt: string | null;
}

// Spring's Page<T> shape for paginated lists.
export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const refundsService = {
  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings(signal?: AbortSignal): Promise<ApiResponse<RefundSetting>> {
    return apiClient.get("/api/admin/refund-settings", { signal });
  },
  updateSettings(payload: UpdateRefundSettingPayload): Promise<ApiResponse<RefundSetting>> {
    return apiClient.put("/api/admin/refund-settings", payload);
  },

  // ── Requests ───────────────────────────────────────────────────────────────
  list(
    params: { status?: RefundRequestStatus; page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<SpringPage<RefundRequestDetail>>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 20));
    return apiClient.get(`/api/admin/refunds?${qs.toString()}`, { signal });
  },
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<RefundRequestDetail>> {
    return apiClient.get(`/api/admin/refunds/${id}`, { signal });
  },
  approve(id: string, adminNote?: string): Promise<ApiResponse<RefundRequestDetail>> {
    return apiClient.post(`/api/admin/refunds/${id}/approve`, { adminNote });
  },
  reject(id: string, rejectionReason: string): Promise<ApiResponse<RefundRequestDetail>> {
    return apiClient.post(`/api/admin/refunds/${id}/reject`, { rejectionReason });
  },
  markReceived(id: string): Promise<ApiResponse<RefundRequestDetail>> {
    return apiClient.post(`/api/admin/refunds/${id}/mark-received`);
  },
  pay(id: string): Promise<ApiResponse<RefundRequestDetail>> {
    return apiClient.post(`/api/admin/refunds/${id}/pay`);
  },
};
