import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

const BASE = "/api/admin/b2b/quotes";

/** B2B RFQ quote status lifecycle (mirrors backend B2bQuoteStatus enum). */
export type B2bQuoteStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "QUOTED"
  | "ACCEPTED"
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
}

/** Body for POST /{id}/price. */
export interface B2bQuotePriceRequest {
  items: B2bQuotePriceItem[];
  /** ISO instant string, e.g. 2026-07-31T12:00:00Z. */
  validUntil: string;
  procurementNote?: string;
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

  // GET /api/admin/b2b/quotes/count  → { newCount }  (count of SUBMITTED quotes)
  getNewCount(signal?: AbortSignal): Promise<ApiResponse<B2bQuoteCount>> {
    return apiClient.get<ApiResponse<B2bQuoteCount>>(`${BASE}/count`, { signal });
  },
};
