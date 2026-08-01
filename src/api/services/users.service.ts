import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  UsersListResponse,
  UserDetail,
  CreateAdminRequest,
  AdminEmailLookup,
} from "../../types/user.types";

const BASE = "/api/admin/users";

export const usersService = {
  /** SUPERADMIN: create a new admin user and assign roles. Returns the created user's detail. */
  createAdmin(payload: CreateAdminRequest): Promise<ApiResponse<UserDetail>> {
    return apiClient.post<ApiResponse<UserDetail>>(BASE, payload);
  },

  /**
   * SUPERADMIN: admin accounts only, filtered server-side.
   *
   * Prefer this over paging {@link getAll} and filtering for `userType === "ADMIN"` in the
   * browser — that only ever saw the newest page of *all* users, so on a store with more
   * registered customers than the page size, older admins silently disappeared from the list
   * while still occupying their email address.
   */
  getAdmins(
    page: number = 0,
    size: number = 20,
    search?: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<UsersListResponse>> {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (search && search.trim()) qs.set("search", search.trim());
    return apiClient.get<ApiResponse<UsersListResponse>>(`${BASE}/admins?${qs.toString()}`, {
      signal,
    });
  },

  /** SUPERADMIN: what currently holds an email address, and whether it can be promoted. */
  lookupEmail(email: string, signal?: AbortSignal): Promise<ApiResponse<AdminEmailLookup>> {
    const qs = new URLSearchParams({ email });
    return apiClient.get<ApiResponse<AdminEmailLookup>>(`${BASE}/lookup?${qs.toString()}`, {
      signal,
    });
  },

  /** SUPERADMIN: convert an existing customer account into an admin with the given roles. */
  promoteToAdmin(userId: string, roleIds: string[]): Promise<ApiResponse<UserDetail>> {
    return apiClient.post<ApiResponse<UserDetail>>(`${BASE}/${userId}/promote`, { roleIds });
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
