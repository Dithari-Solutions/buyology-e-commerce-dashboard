import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/repairs";

/** Repair request lifecycle (mirrors backend RepairStatus enum). */
export type RepairStatus =
  | "SUBMITTED"
  | "AWAITING_DEVICE"
  | "UNDER_REVIEW"
  | "PRICE_ESTIMATED"
  | "IN_REPAIR"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

/** How the device travels (mirrors backend RepairDeliveryMethod enum). */
export type RepairDeliveryMethod =
  | "COURIER_PICKUP"
  | "STORE_DROPOFF"
  | "COURIER_RETURN"
  | "STORE_PICKUP";

/** A repair request (mirrors backend RepairRequestResponse). */
export interface RepairRequest {
  id: string;
  reference?: string | null;
  productName: string;
  brand: string;
  model: string;
  purchaseDate?: string | null;
  description: string;
  /** Presigned GET urls — backend converts stored image keys on read. */
  imageUrls?: string[] | null;
  status: RepairStatus;
  inboundDeliveryMethod?: RepairDeliveryMethod | null;
  storeLocationId?: string | null;
  storeBranchName?: string | null;
  storeAddress?: string | null;
  returnDeliveryMethod?: RepairDeliveryMethod | null;
  courierFeeAmount?: number | null;
  courierFeeCurrency?: string | null;
  estimatedPrice?: number | null;
  estimatedPriceCurrency?: string | null;
  estimatedTime?: string | null;
  adminNote?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  adminUnread: boolean;
  customerUnread: boolean;
  deviceReceivedAt?: string | null;
  pricedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /count. */
export interface RepairCount {
  newCount: number;
}

export interface SetRepairPricePayload {
  price: number;
  currency?: string;
  estimatedTime?: string;
  note?: string;
}

export const repairService = {
  // GET /api/admin/repairs[?status=UNDER_REVIEW]
  list(status?: RepairStatus, signal?: AbortSignal): Promise<ApiResponse<RepairRequest[]>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<ApiResponse<RepairRequest[]>>(`${BASE}${query}`, { signal });
  },

  // GET /api/admin/repairs/{id}  (also clears the unread flag server-side)
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<RepairRequest>> {
    return apiClient.get<ApiResponse<RepairRequest>>(`${BASE}/${id}`, { signal });
  },

  // POST /api/admin/repairs/{id}/received  → UNDER_REVIEW
  markReceived(id: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<ApiResponse<RepairRequest>>(`${BASE}/${id}/received`, {});
  },

  // POST /api/admin/repairs/{id}/price  → PRICE_ESTIMATED
  setPrice(id: string, payload: SetRepairPricePayload): Promise<ApiResponse<RepairRequest>> {
    return apiClient.post<ApiResponse<RepairRequest>>(`${BASE}/${id}/price`, payload);
  },

  // PATCH /api/admin/repairs/{id}/status  body { status, note? }
  updateStatus(id: string, status: RepairStatus, note?: string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.patch<ApiResponse<RepairRequest>>(`${BASE}/${id}/status`, { status, note });
  },

  // GET /api/admin/repairs/count  → { newCount }
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<RepairCount>> {
    return apiClient.get<ApiResponse<RepairCount>>(`${BASE}/count`, { signal });
  },
};
