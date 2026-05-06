import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
export type WalletTransactionType = "CREDIT" | "DEBIT" | "REFUND" | "ADJUSTMENT" | "REPAYMENT";
export type MembershipStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "TRASHED";
export type CreditUsageStatus = "OUTSTANDING" | "PARTIAL" | "PAID" | "OVERDUE";

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
  status: MembershipStatus;
  tier: "PREMIUM";
  walletBalance?: number;
  walletCurrency?: string;
  validUntil?: string;
  frozenAt?: string;
  deletedAt?: string;
  createdAt: string;
  qrCodePlaceholder?: string;
}

export interface WalletInfo {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  countryCode?: string;
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditUsage {
  id: string;
  userId: string;
  membershipId: string;
  orderId: string;
  amount: number;
  currency: string;
  paidAmount: number;
  status: CreditUsageStatus;
  usedAt: string;
  dueAt: string;
  paidAt?: string;
  paymobIntentionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface B2bCountry {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  enabled: boolean;
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

  // ── Admin: lifecycle ─────────────────────────────────────────────────────
  freezeMembership(id: string): Promise<ApiResponse<string>> {
    return apiClient.post(`/api/admin/membership/memberships/${id}/freeze`);
  },
  unfreezeMembership(id: string): Promise<ApiResponse<string>> {
    return apiClient.post(`/api/admin/membership/memberships/${id}/unfreeze`);
  },
  trashMembership(id: string): Promise<ApiResponse<string>> {
    return apiClient.delete(`/api/admin/membership/memberships/${id}`);
  },
  restoreMembership(id: string): Promise<ApiResponse<string>> {
    return apiClient.post(`/api/admin/membership/memberships/${id}/restore`);
  },

  // ── Admin: credit usages + payback config ────────────────────────────────
  listCreditUsages(status?: CreditUsageStatus, signal?: AbortSignal): Promise<ApiResponse<CreditUsage[]>> {
    const qs = status ? `?status=${status}` : "";
    return apiClient.get(`/api/admin/membership/credit/usages${qs}`, { signal });
  },
  updateUsageDeadline(
    id: string,
    payload: { dueAt?: string; extendDays?: number },
  ): Promise<ApiResponse<CreditUsage>> {
    return apiClient.patch(`/api/admin/membership/credit/usages/${id}`, payload);
  },
  getPaybackConfig(signal?: AbortSignal): Promise<ApiResponse<{ paybackDays: number }>> {
    return apiClient.get(`/api/admin/membership/credit/config`, { signal });
  },
  updatePaybackConfig(paybackDays: number): Promise<ApiResponse<{ paybackDays: number }>> {
    return apiClient.patch(`/api/admin/membership/credit/config`, { paybackDays });
  },

  // ── Admin: B2B countries ─────────────────────────────────────────────────
  listCountries(signal?: AbortSignal): Promise<ApiResponse<B2bCountry[]>> {
    return apiClient.get(`/api/admin/b2b/countries`, { signal });
  },
  upsertCountry(payload: {
    countryCode: string;
    countryName: string;
    currencyCode: string;
    enabled?: boolean;
  }): Promise<ApiResponse<B2bCountry>> {
    return apiClient.post(`/api/admin/b2b/countries`, payload);
  },
  deleteCountry(id: string): Promise<ApiResponse<string>> {
    return apiClient.delete(`/api/admin/b2b/countries/${id}`);
  },

  // ── Member self-service ──────────────────────────────────────────────────
  freezeMyMembership(): Promise<ApiResponse<string>> {
    return apiClient.post(`/api/membership/freeze`);
  },
  unfreezeMyMembership(): Promise<ApiResponse<string>> {
    return apiClient.post(`/api/membership/unfreeze`);
  },
  deleteMyMembership(): Promise<ApiResponse<string>> {
    return apiClient.delete(`/api/membership`);
  },
  myCreditUsages(signal?: AbortSignal): Promise<ApiResponse<CreditUsage[]>> {
    return apiClient.get(`/api/membership/credit/usages`, { signal });
  },
  initiatePayback(
    usageId: string,
    payload?: { amount?: number; email?: string },
  ): Promise<
    ApiResponse<{
      usageId: string;
      amount: number;
      currency: string;
      intentionId: string;
      clientSecret: string;
      checkoutUrl: string;
    }>
  > {
    return apiClient.post(`/api/membership/credit/usages/${usageId}/pay`, payload ?? {});
  },
};
