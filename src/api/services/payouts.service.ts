import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { SpringPage } from "./refunds.service";

export type PayoutRequestStatus = "PENDING" | "PAID" | "REJECTED";

export interface SupplierPayoutAccount {
  id: string;
  supplierId: string;
  legalName: string;
  bankName: string | null;
  accountHolderName: string | null;
  iban: string | null;
  swiftCode: string | null;
  walletProvider: string | null;
  walletNumber: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface PayoutRequestDetail {
  id: string;
  supplierId: string;
  amountAed: number;
  accountSnapshotJson: string;
  status: PayoutRequestStatus;
  adminNote: string | null;
  paidByAdminId: string | null;
  paidAt: string | null;
  createdAt: string;
  orderItemIds: string[];
}

export interface PayoutEligibility {
  eligible: boolean;
  owedAmountAed: number;
  nextEligibleDate: string | null;
  reason: string;
}

export interface SupplierPayoutAccountPayload {
  legalName: string;
  bankName?: string | null;
  accountHolderName?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  walletProvider?: string | null;
  walletNumber?: string | null;
}

export const supplierPayoutsService = {
  getAccount(signal?: AbortSignal): Promise<ApiResponse<SupplierPayoutAccount | null>> {
    return apiClient.get(`/api/supplier/payouts/account`, { signal });
  },
  upsertAccount(payload: SupplierPayoutAccountPayload): Promise<ApiResponse<SupplierPayoutAccount>> {
    return apiClient.put(`/api/supplier/payouts/account`, payload);
  },
  eligibility(signal?: AbortSignal): Promise<ApiResponse<PayoutEligibility>> {
    return apiClient.get(`/api/supplier/payouts/eligibility`, { signal });
  },
  submit(): Promise<ApiResponse<PayoutRequestDetail>> {
    return apiClient.post(`/api/supplier/payouts/requests`, {});
  },
  history(
    params: { page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<SpringPage<PayoutRequestDetail>>> {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 20));
    return apiClient.get(`/api/supplier/payouts/requests?${qs.toString()}`, { signal });
  },
};

export const payoutsService = {
  list(
    params: { status?: PayoutRequestStatus; page?: number; size?: number },
    signal?: AbortSignal
  ): Promise<ApiResponse<SpringPage<PayoutRequestDetail>>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 20));
    return apiClient.get(`/api/admin/payouts/requests?${qs.toString()}`, { signal });
  },
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<PayoutRequestDetail>> {
    return apiClient.get(`/api/admin/payouts/requests/${id}`, { signal });
  },
  markPaid(id: string, note?: string): Promise<ApiResponse<PayoutRequestDetail>> {
    return apiClient.post(`/api/admin/payouts/requests/${id}/mark-paid`, { note });
  },
  reject(id: string, note: string): Promise<ApiResponse<PayoutRequestDetail>> {
    return apiClient.post(`/api/admin/payouts/requests/${id}/reject`, { note });
  },
  getSupplierAccount(
    supplierId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SupplierPayoutAccount>> {
    return apiClient.get(`/api/admin/payouts/suppliers/${supplierId}/account`, { signal });
  },
};
