import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface B2bInquiry {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone?: string;
  quantity: number;
  message?: string;
  status: "NEW" | "REVIEWED" | "RESPONDED";
  adminNotes?: string;
  createdAt: string;
}

export const b2bService = {
  listAll(signal?: AbortSignal): Promise<ApiResponse<B2bInquiry[]>> {
    return apiClient.get("/api/admin/b2b/inquiries", { signal });
  },
  updateStatus(id: string, status: string, adminNotes?: string): Promise<ApiResponse<B2bInquiry>> {
    return apiClient.patch(`/api/admin/b2b/inquiries/${id}/status`, { status, adminNotes });
  },
};
