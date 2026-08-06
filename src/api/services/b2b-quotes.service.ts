import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/b2b/quotes";

/** B2B RFQ quote status lifecycle (mirrors backend B2bQuoteStatus enum). */
export type B2bQuoteStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "QUOTED"
  | "ACCEPTED"
  | "AWAITING_PAYMENT_VERIFICATION"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "ORDERED";

/** A single line in a B2B quote (mirrors backend B2bQuoteItemResponse). */
export interface B2bQuoteItem {
  id: string;
  storeProductId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  productTitle?: string | null;
  sku?: string | null;
  /** Lead time set at pricing (e.g. "2–3 weeks"). */
  leadTime?: string | null;
  /** Optional line description set at pricing. */
  description?: string | null;
  /** null until the quote is QUOTED. */
  quotedUnitPrice?: number | null;
  /** quotedUnitPrice * quantity; null until QUOTED. */
  quotedLineTotal?: number | null;
  /** true when quantity < minQtyPerLine. */
  belowMinimum: boolean;
}

/** A B2B RFQ quote (mirrors backend B2bQuoteResponse). */
export interface B2bQuote {
  id: string;
  status: B2bQuoteStatus;
  countryCode: string;
  currency: string;
  memberNote?: string | null;
  procurementNote?: string | null;
  paymentTerms?: string | null;
  termsAndConditions?: string | null;
  /** "BANK_TRANSFER" once the member submits a bank-transfer proof. */
  paymentMethod?: string | null;
  /** Presigned URL of the uploaded bank-transfer proof; null if none. */
  proofOfPaymentFileUrl?: string | null;
  proofUploadedAt?: string | null;
  paymentVerifiedAt?: string | null;
  submittedAt?: string | null;
  quotedAt?: string | null;
  validUntil?: string | null;
  acceptedAt?: string | null;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Minimum quantity required per line (=5). */
  minQtyPerLine: number;
  /** true when any line is below the per-line minimum. */
  belowMinimum: boolean;
  /** Sum of quotedLineTotal across items; null until QUOTED. */
  quotedSubtotal?: number | null;
  items: B2bQuoteItem[];
}

/** Per-line price sent when quoting. */
export interface B2bQuotePriceItem {
  itemId: string;
  unitPrice: number;
  /** Lead time for this line (e.g. "2–3 weeks"). */
  leadTime?: string;
  /** Optional line description. */
  description?: string;
}

/** Body for POST /{id}/price. */
export interface B2bQuotePriceRequest {
  items: B2bQuotePriceItem[];
  /** ISO instant string, e.g. 2026-07-31T12:00:00Z. */
  validUntil: string;
  procurementNote?: string;
  paymentTerms?: string;
  termsAndConditions?: string;
}

/** Shape returned by GET /count. */
export interface B2bQuoteCount {
  /** Count of SUBMITTED quotes awaiting pricing. */
  newCount: number;
}

export const b2bQuotesService = {
  // GET /api/admin/b2b/quotes?status=  (default SUBMITTED, server-side)
  list(status?: B2bQuoteStatus, signal?: AbortSignal): Promise<ApiResponse<B2bQuote[]>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<ApiResponse<B2bQuote[]>>(`${BASE}${query}`, { signal });
  },

  // GET /api/admin/b2b/quotes/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<B2bQuote>> {
    return apiClient.get<ApiResponse<B2bQuote>>(`${BASE}/${id}`, { signal });
  },

  // POST /api/admin/b2b/quotes/{id}/price  → SUBMITTED → QUOTED
  price(id: string, body: B2bQuotePriceRequest): Promise<ApiResponse<B2bQuote>> {
    return apiClient.post<ApiResponse<B2bQuote>>(`${BASE}/${id}/price`, body);
  },

  // POST /api/admin/b2b/quotes/{id}/reject  → SUBMITTED → REJECTED
  reject(id: string, reason: string): Promise<ApiResponse<B2bQuote>> {
    return apiClient.post<ApiResponse<B2bQuote>>(`${BASE}/${id}/reject`, { reason });
  },

  // POST /api/admin/b2b/quotes/{id}/verify-payment  → AWAITING_PAYMENT_VERIFICATION → ORDERED
  verifyPayment(id: string): Promise<ApiResponse<B2bQuote>> {
    return apiClient.post<ApiResponse<B2bQuote>>(`${BASE}/${id}/verify-payment`);
  },

  // POST /api/admin/b2b/quotes/{id}/reject-payment  → AWAITING_PAYMENT_VERIFICATION → ACCEPTED
  rejectPayment(id: string, reason: string): Promise<ApiResponse<B2bQuote>> {
    return apiClient.post<ApiResponse<B2bQuote>>(`${BASE}/${id}/reject-payment`, { reason });
  },

  // GET /api/admin/b2b/quotes/count  → { newCount }  (count of SUBMITTED quotes)
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<B2bQuoteCount>> {
    return apiClient.get<ApiResponse<B2bQuoteCount>>(`${BASE}/count`, { signal });
  },
};
