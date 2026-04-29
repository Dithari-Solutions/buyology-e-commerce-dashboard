import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
export type WalletTransactionType = "CREDIT" | "DEBIT" | "REFUND" | "ADJUSTMENT";

export interface MembershipApplication {
  id: string;
  userId: string | null;
  companyName: string;
  tradeLicenseNumber: string;
  industryType: string;
  numberOfEmployees: number;
  country: string;
  city: string;
  website?: string;
  contactFullName: string;
  contactDesignation: string;
  contactEmail: string;
  contactMobile: string;
  businessNeeds?: string[];
  tradeLicenseFileUrl?: string;
  vatCertificateFileUrl?: string;
  termsAccepted: boolean;
  status: ApplicationStatus;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipCard {
  id: string;
  membershipId: string;
  userId: string;
  companyName: string;
  memberName: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  tier: "PREMIUM";
  walletBalance?: number;
  walletCurrency?: string;
  validUntil?: string;
  createdAt: string;
  qrCodePlaceholder?: string;
}

export interface WalletInfo {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  performedBy?: string;
  createdAt: string;
}

export interface ApplicationActionRequest {
  action: "APPROVE" | "REJECT" | "UNDER_REVIEW";
  rejectionReason?: string;
  performedBy?: string;
}

export interface WalletCreditRequest {
  amount: number;
  description?: string;
  performedBy?: string;
}

export const b2bMembershipService = {
  listApplications(signal?: AbortSignal): Promise<ApiResponse<MembershipApplication[]>> {
    return apiClient.get("/api/admin/membership/applications", { signal });
  },

  processAction(id: string, req: ApplicationActionRequest): Promise<ApiResponse<MembershipApplication>> {
    return apiClient.post(`/api/admin/membership/applications/${id}/action`, req);
  },

  listMemberships(signal?: AbortSignal): Promise<ApiResponse<MembershipCard[]>> {
    return apiClient.get("/api/admin/membership/memberships", { signal });
  },

  getUserWallet(userId: string, signal?: AbortSignal): Promise<ApiResponse<WalletInfo>> {
    return apiClient.get(`/api/admin/membership/wallet/${userId}`, { signal });
  },

  addCredit(userId: string, req: WalletCreditRequest): Promise<ApiResponse<WalletInfo>> {
    return apiClient.post(`/api/admin/membership/wallet/${userId}/credit`, req);
  },

  deductCredit(userId: string, req: WalletCreditRequest): Promise<ApiResponse<WalletInfo>> {
    return apiClient.post(`/api/admin/membership/wallet/${userId}/deduct`, req);
  },

  adjustBalance(userId: string, req: WalletCreditRequest): Promise<ApiResponse<WalletInfo>> {
    return apiClient.post(`/api/admin/membership/wallet/${userId}/adjust`, req);
  },

  getTransactions(userId: string, signal?: AbortSignal): Promise<ApiResponse<WalletTransaction[]>> {
    return apiClient.get(`/api/admin/membership/wallet/${userId}/transactions`, { signal });
  },
};
