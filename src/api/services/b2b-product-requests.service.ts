import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/b2b/product-requests";

/** B2B product-sourcing request status lifecycle (mirrors backend B2bProductRequestStatus enum). */
export type B2bProductRequestStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

/** A B2B product-sourcing request (mirrors backend B2bProductRequestResponse). */
export interface B2bProductRequest {
  id: string;
  productName: string;
  quantity: number;
  message?: string | null;
  /** Presigned GET url — backend converts the stored image_key to a presigned url on read. */
  imageUrl?: string | null;
  status: B2bProductRequestStatus;
  procurementNote?: string | null;
  memberName?: string | null;
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
}

/** Shape returned by GET /count. */
export interface B2bProductRequestCount {
  newCount: number;
}

export const b2bProductRequestsService = {
  // GET /api/admin/b2b/product-requests[?status=NEW]
  list(status?: B2bProductRequestStatus, signal?: AbortSignal): Promise<ApiResponse<B2bProductRequest[]>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<ApiResponse<B2bProductRequest[]>>(`${BASE}${query}`, { signal });
  },

  // GET /api/admin/b2b/product-requests/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<B2bProductRequest>> {
    return apiClient.get<ApiResponse<B2bProductRequest>>(`${BASE}/${id}`, { signal });
  },

  // PATCH /api/admin/b2b/product-requests/{id}/status  body { status, note? }
  updateStatus(
    id: string,
    status: B2bProductRequestStatus,
    note?: string
  ): Promise<ApiResponse<B2bProductRequest>> {
    return apiClient.patch<ApiResponse<B2bProductRequest>>(`${BASE}/${id}/status`, { status, note });
  },

  // POST /api/admin/b2b/product-requests/{id}/update  body { message }
  sendUpdate(id: string, message: string): Promise<ApiResponse<B2bProductRequest>> {
    return apiClient.post<ApiResponse<B2bProductRequest>>(`${BASE}/${id}/update`, { message });
  },

  // GET /api/admin/b2b/product-requests/count  → { newCount }
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<B2bProductRequestCount>> {
    return apiClient.get<ApiResponse<B2bProductRequestCount>>(`${BASE}/count`, { signal });
  },
};
