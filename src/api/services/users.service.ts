import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { UsersListResponse, UserDetail, CreateAdminRequest } from "../../types/user.types";

const BASE = "/api/admin/users";

export const usersService = {
  /** SUPERADMIN: create a new admin user and assign roles. Returns the created user's detail. */
  createAdmin(payload: CreateAdminRequest): Promise<ApiResponse<UserDetail>> {
    return apiClient.post<ApiResponse<UserDetail>>(BASE, payload);
  },

  getAll(
    page: number = 0,
    size: number = 20,
    signal?: AbortSignal
  ): Promise<ApiResponse<UsersListResponse>> {
    return apiClient.get<ApiResponse<UsersListResponse>>(
      `${BASE}?page=${page}&size=${size}`,
      { signal }
    );
  },

  /** Search users by name or credential email (for the promo issue-to-user picker). */
  search(
    query: string,
    page: number = 0,
    size: number = 8,
    signal?: AbortSignal
  ): Promise<ApiResponse<UsersListResponse>> {
    const qs = new URLSearchParams({ page: String(page), size: String(size), search: query });
    return apiClient.get<ApiResponse<UsersListResponse>>(`${BASE}?${qs.toString()}`, { signal });
  },

  getById(
    authCredentialId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<UserDetail>> {
    return apiClient.get<ApiResponse<UserDetail>>(
      `${BASE}/${authCredentialId}`,
      { signal }
    );
  },

  blockUser(
    userId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<unknown>> {
    return apiClient.patch<ApiResponse<unknown>>(
      `${BASE}/${userId}/block`,
      undefined,
      { signal }
    );
  },

  unblockUser(
    userId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<unknown>> {
    return apiClient.patch<ApiResponse<unknown>>(
      `${BASE}/${userId}/unblock`,
      undefined,
      { signal }
    );
  },

  blockInactive(signal?: AbortSignal): Promise<ApiResponse<null>> {
    return apiClient.post<ApiResponse<null>>(
      `${BASE}/block-inactive`,
      undefined,
      { signal }
    );
  },
};
