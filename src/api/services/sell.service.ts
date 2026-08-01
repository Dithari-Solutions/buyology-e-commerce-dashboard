import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/sell-requests";

/** Sell (trade-in) request lifecycle (mirrors backend SellStatus enum). */
export type SellStatus =
  | "SUBMITTED"
  | "AWAITING_DEVICE"
  | "UNDER_REVIEW"
  | "OFFER_MADE"
  | "ACCEPTED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

/** How the device travels (mirrors backend SellDeliveryMethod enum). */
export type SellDeliveryMethod =
  | "COURIER_PICKUP"
  | "STORE_DROPOFF"
  | "COURIER_RETURN"
  | "STORE_PICKUP";

/** Device grading (mirrors backend DeviceCondition enum). */
export type DeviceCondition = "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";

/** How the customer takes the money (mirrors backend SellPayoutMethod enum). */
export type SellPayoutMethod = "STORE_CASH" | "WALLET_CREDIT";

/** A sell request (mirrors backend SellRequestResponse). */
export interface SellRequest {
  id: string;
  reference?: string | null;
  productName: string;
  brand: string;
  model: string;
  purchaseDate?: string | null;
  deviceCondition: DeviceCondition;
  description: string;
  /** Presigned GET urls — backend converts stored image keys on read. */
  imageUrls?: string[] | null;
  status: SellStatus;
  inboundDeliveryMethod?: SellDeliveryMethod | null;
  storeLocationId?: string | null;
  storeBranchName?: string | null;
  storeAddress?: string | null;
  returnDeliveryMethod?: SellDeliveryMethod | null;
  courierFeeAmount?: number | null;
  courierFeeCurrency?: string | null;
  courierFeePaid: boolean;
  /** What Buyology pays — set by procurement, accepted or declined by the customer. */
  offerPrice?: number | null;
  offerPriceCurrency?: string | null;
  offerValidFor?: string | null;
  inspectedCondition?: DeviceCondition | null;
  payoutMethod?: SellPayoutMethod | null;
  paidOutAt?: string | null;
  /** Advisory AI valuation (Claude, from the device photos + description + declared condition).
   *  Priced in AED for the UAE second-hand market. Never the binding offer — procurement still
   *  sends that. */
  aiEstimateMinPrice?: number | null;
  aiEstimateMaxPrice?: number | null;
  aiEstimateCurrency?: string | null;
  aiEstimateConfidence?: "LOW" | "MEDIUM" | "HIGH" | null;
  aiEstimateSummary?: string | null;
  aiEstimateCondition?: DeviceCondition | null;
  aiEstimatedAt?: string | null;
  adminNote?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  adminUnread: boolean;
  customerUnread: boolean;
  deviceReceivedAt?: string | null;
  offeredAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /count. */
export interface SellRequestCount {
  newCount: number;
}

export interface SetSellOfferPayload {
  price: number;
  currency?: string;
  validFor?: string;
  inspectedCondition?: DeviceCondition;
  note?: string;
}

export const sellService = {
  // GET /api/admin/sell-requests[?status=UNDER_REVIEW]
  list(status?: SellStatus, signal?: AbortSignal): Promise<ApiResponse<SellRequest[]>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<ApiResponse<SellRequest[]>>(`${BASE}${query}`, { signal });
  },

  // GET /api/admin/sell-requests/{id}  (also clears the unread flag server-side)
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<SellRequest>> {
    return apiClient.get<ApiResponse<SellRequest>>(`${BASE}/${id}`, { signal });
  },

  // POST /api/admin/sell-requests/{id}/received  → UNDER_REVIEW
  markReceived(id: string): Promise<ApiResponse<SellRequest>> {
    return apiClient.post<ApiResponse<SellRequest>>(`${BASE}/${id}/received`, {});
  },

  // POST /api/admin/sell-requests/{id}/offer  → OFFER_MADE
  setOffer(id: string, payload: SetSellOfferPayload): Promise<ApiResponse<SellRequest>> {
    return apiClient.post<ApiResponse<SellRequest>>(`${BASE}/${id}/offer`, payload);
  },

  // POST /api/admin/sell-requests/{id}/paid  → COMPLETED (store handed the money over)
  markPaidOut(id: string): Promise<ApiResponse<SellRequest>> {
    return apiClient.post<ApiResponse<SellRequest>>(`${BASE}/${id}/paid`, {});
  },

  // PATCH /api/admin/sell-requests/{id}/status  body { status, note? }
  updateStatus(id: string, status: SellStatus, note?: string): Promise<ApiResponse<SellRequest>> {
    return apiClient.patch<ApiResponse<SellRequest>>(`${BASE}/${id}/status`, { status, note });
  },

  // GET /api/admin/sell-requests/count  → { newCount }
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<SellRequestCount>> {
    return apiClient.get<ApiResponse<SellRequestCount>>(`${BASE}/count`, { signal });
  },
};
