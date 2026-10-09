import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Application } from "../../pages/PartnershipRequests/qualification";
export interface PartnershipRequest {
 id: string; application: Application; status: "NEW" | "REVIEWED" | "RESPONDED";
 adminNotes: string | null; createdAt: string; emailStatus: "PENDING" | "SENT" | "FAILED"; emailAttempts: number;
}
export interface PartnershipPage { content: PartnershipRequest[]; totalElements: number; totalPages: number; number: number; }
export const partnershipService = {
 list(page: number, signal?: AbortSignal): Promise<ApiResponse<PartnershipPage>> { return apiClient.get(`/api/admin/partnership/requests?page=${page}`, { signal }); },
 update(id: string, status: string, adminNotes: string): Promise<ApiResponse<PartnershipRequest>> { return apiClient.patch(`/api/admin/partnership/requests/${id}/status`, { status, adminNotes }); },
};
