import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { MfaStatusData } from "../../types/auth.types";

/**
 * Authenticated two-factor settings endpoints (require a live session).
 * The enrollment / sign-in verification calls live in auth.service.ts because
 * they run before a session exists.
 */
export const mfaService = {
  /** GET /auth/mfa/status — current user's 2FA state. */
  status: () => apiClient.get<ApiResponse<MfaStatusData>>("/auth/mfa/status"),

  /** POST /auth/mfa/recovery-codes/regenerate — needs a valid current code. */
  regenerateRecoveryCodes: (code: string) =>
    apiClient.post<ApiResponse<string[]>>("/auth/mfa/recovery-codes/regenerate", { code }),

  /** POST /api/admin/users/{userId}/mfa/reset — SUPERADMIN-only lost-device recovery. */
  resetUserMfa: (userId: string) =>
    apiClient.post<ApiResponse<string>>(`/api/admin/users/${userId}/mfa/reset`),
};
