import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface CreatePromoCodeRequest {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount?: number;
  maxUsesTotal?: number;
  maxUsesPerCustomer?: number;
  expiresAt?: string;
  description?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount?: number;
  maxUsesTotal?: number;
  maxUsesPerCustomer?: number;
  totalUsed: number;
  expiresAt?: string;
  targetUserId?: string | null;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface IssuePersonalCodeRequest {
  userId: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount?: number;
  validityDays?: number;
  maxUses?: number;
  description?: string;
  sendEmail: boolean;
  sendPush: boolean;
}

export interface TokenRedemptionConfig {
  enabled: boolean;
  tokenCost: number;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount?: number | null;
  couponValidityDays: number;
  maxUsesPerCoupon: number;
  maxRedemptionsPerCustomer?: number | null;
}

export interface SendPromoRequest {
  targetUserIds?: string[];
  sendEmail: boolean;
  sendPush: boolean;
}

export interface PromoUsage {
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  orderId: string;
  discountApplied: number;
  usedAt: string;
}

export const promoService = {
  create(req: CreatePromoCodeRequest): Promise<ApiResponse<PromoCode>> {
    return apiClient.post("/api/admin/promo", req);
  },
  listAll(signal?: AbortSignal): Promise<ApiResponse<PromoCode[]>> {
    return apiClient.get("/api/admin/promo", { signal });
  },
  update(id: string, req: CreatePromoCodeRequest): Promise<ApiResponse<PromoCode>> {
    return apiClient.put(`/api/admin/promo/${id}`, req);
  },
  deactivate(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/admin/promo/${id}`);
  },
  sendToCustomers(id: string, req: SendPromoRequest): Promise<ApiResponse<void>> {
    return apiClient.post(`/api/admin/promo/${id}/send`, req);
  },
  usages(id: string, signal?: AbortSignal): Promise<ApiResponse<PromoUsage[]>> {
    return apiClient.get(`/api/admin/promo/${id}/usages`, { signal });
  },
  issueToUser(req: IssuePersonalCodeRequest): Promise<ApiResponse<PromoCode>> {
    return apiClient.post("/api/admin/promo/issue", req);
  },
  getRedeemConfig(signal?: AbortSignal): Promise<ApiResponse<TokenRedemptionConfig>> {
    return apiClient.get("/api/admin/promo/redeem-config", { signal });
  },
  updateRedeemConfig(req: TokenRedemptionConfig): Promise<ApiResponse<TokenRedemptionConfig>> {
    return apiClient.put("/api/admin/promo/redeem-config", req);
  },
};
