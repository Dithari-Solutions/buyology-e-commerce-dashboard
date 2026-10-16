import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

export interface CookieDecision {
  decisionId: string; consentId: string; necessary: boolean; analytics: boolean; marketing: boolean;
  policyVersion: string; source: string; language: string; sourceHost: string | null; recordedAt: string;
}
export interface CookieDecisionPage { content: CookieDecision[]; totalElements: number; totalPages: number; page: number; size: number }
export interface CookieDetail { name: string; category: string; storage: string; provider: string; purpose: string; duration: string }
export interface CookiePolicy { version: string; choiceLifetimeDays: number; auditRetentionDays: number; cookies: CookieDetail[] }

export const cookieConsentService = {
  list(page: number, consentId: string, analytics: string, marketing: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: "25" });
    if (consentId) query.set("consentId", consentId);
    if (analytics) query.set("analytics", analytics);
    if (marketing) query.set("marketing", marketing);
    return apiClient.get<ApiResponse<CookieDecisionPage>>(`/api/admin/privacy/consents?${query}`, { signal });
  },
  policy(signal?: AbortSignal) { return apiClient.get<ApiResponse<CookiePolicy>>("/api/privacy/cookies", { signal }); },
};
