import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { Application } from "../../pages/PartnershipRequests/qualification";
export interface PartnershipRequest {
 id: string; application: Application; status: "NEW" | "REVIEWED" | "RESPONDED";
 adminNotes: string | null; createdAt: string; emailStatus: "PENDING" | "SENT" | "FAILED"; emailAttempts: number;
}
export interface PartnershipPage { content: PartnershipRequest[]; totalElements: number; totalPages: number; number: number; }
export interface InvitationTemplate { version: string; subject: string; html: string; maxRecipients: number; }
export interface InvitationSubmission { requestId: string; emails: string; templateVersion: string; }
export interface InvitationBatch {
 id: string; createdAt: string; templateVersion: string;
 recipients: { email: string; status: "QUEUED" | "SENDING" | "ACCEPTED" | "FAILED" | "UNKNOWN"; finishedAt: string | null }[];
}
export const partnershipService = {
 list(page: number, signal?: AbortSignal): Promise<ApiResponse<PartnershipPage>> { return apiClient.get(`/api/admin/partnership/requests?page=${page}`, { signal }); },
 update(id: string, status: string, adminNotes: string): Promise<ApiResponse<PartnershipRequest>> { return apiClient.patch(`/api/admin/partnership/requests/${id}/status`, { status, adminNotes }); },
 invitationTemplate(signal?: AbortSignal): Promise<ApiResponse<InvitationTemplate>> { return apiClient.get("/api/admin/partnership/invitations/template", { signal }); },
 invite(input: InvitationSubmission): Promise<ApiResponse<InvitationBatch>> { return apiClient.post("/api/admin/partnership/invitations", input); },
 invitations(signal?: AbortSignal): Promise<ApiResponse<InvitationBatch[]>> { return apiClient.get("/api/admin/partnership/invitations", { signal }); },
 invitation(id: string, signal?: AbortSignal): Promise<ApiResponse<InvitationBatch>> { return apiClient.get(`/api/admin/partnership/invitations/${encodeURIComponent(id)}`, { signal }); },
};
