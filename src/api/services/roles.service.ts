import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  Role,
  Permission,
  UserRole,
  UserPermissionOverride,
  AssignRoleRequest,
  AssignPermissionRequest,
} from "../../types/roles.types";

export const rolesService = {
  getAllRoles(signal?: AbortSignal): Promise<ApiResponse<Role[]>> {
    return apiClient.get<ApiResponse<Role[]>>("/api/admin/roles", { signal });
  },

  getAllPermissions(signal?: AbortSignal): Promise<ApiResponse<Permission[]>> {
    return apiClient.get<ApiResponse<Permission[]>>("/api/admin/permissions", { signal });
  },

  getUserRoles(userId: string, signal?: AbortSignal): Promise<ApiResponse<UserRole[]>> {
    return apiClient.get<ApiResponse<UserRole[]>>(
      `/api/admin/user-roles/users/${userId}`,
      { signal }
    );
  },

  assignRole(data: AssignRoleRequest): Promise<ApiResponse<UserRole>> {
    return apiClient.post<ApiResponse<UserRole>>("/api/admin/user-roles", data);
  },

  removeRole(userId: string, roleId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `/api/admin/user-roles/users/${userId}/roles/${roleId}`
    );
  },

  getUserPermissions(
    userId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<UserPermissionOverride[]>> {
    return apiClient.get<ApiResponse<UserPermissionOverride[]>>(
      `/api/admin/user-permissions/users/${userId}`,
      { signal }
    );
  },

  assignPermission(
    data: AssignPermissionRequest
  ): Promise<ApiResponse<UserPermissionOverride>> {
    return apiClient.post<ApiResponse<UserPermissionOverride>>(
      "/api/admin/user-permissions",
      data
    );
  },

  removePermission(userId: string, permissionId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(
      `/api/admin/user-permissions/users/${userId}/permissions/${permissionId}`
    );
  },
};
