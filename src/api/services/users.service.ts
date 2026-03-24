import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type { UsersListResponse, UserDetail } from "../../types/user.types";

const BASE = "/api/admin/users";

export const usersService = {
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

  getById(
    authCredentialId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<UserDetail>> {
    return apiClient.get<ApiResponse<UserDetail>>(
      `${BASE}/${authCredentialId}`,
      { signal }
    );
  },
};
