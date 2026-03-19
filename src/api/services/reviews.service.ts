import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Review } from "../../types/review.types";

const BASE = "/api/admin/reviews";

export interface ModerateReviewRequest {
  status: "APPROVED" | "REJECTED";
  moderatedBy: string;
  rejectionReason?: string | null;
}

export interface AddReviewReplyRequest {
  adminId: string;
  body: string;
}

export const reviewsService = {
  getAll(
    params?: { status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<Review[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.size !== undefined) query.set("size", String(params.size));
    const qs = query.toString();
    return apiClient.get<ApiResponse<Review[]>>(`${BASE}${qs ? `?${qs}` : ""}`, { signal });
  },

  getById(reviewId: string, signal?: AbortSignal): Promise<ApiResponse<Review>> {
    return apiClient.get<ApiResponse<Review>>(`${BASE}/${reviewId}`, { signal });
  },

  moderate(reviewId: string, data: ModerateReviewRequest): Promise<ApiResponse<Review>> {
    return apiClient.patch<ApiResponse<Review>>(`${BASE}/${reviewId}/moderate`, data);
  },

  delete(reviewId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${reviewId}`);
  },

  addReply(reviewId: string, data: AddReviewReplyRequest): Promise<ApiResponse<Review>> {
    return apiClient.post<ApiResponse<Review>>(`${BASE}/${reviewId}/reply`, data);
  },

  updateReply(reviewId: string, data: { body: string }): Promise<ApiResponse<Review>> {
    return apiClient.put<ApiResponse<Review>>(`${BASE}/${reviewId}/reply`, data);
  },

  deleteReply(reviewId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`${BASE}/${reviewId}/reply`);
  },
};
