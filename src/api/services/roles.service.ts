import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  Role,
  RoleHolder,
  Permission,
  UserRole,
  UserPermissionOverride,
  AssignRoleRequest,
  AssignPermissionRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
} from "../../types/roles.types";

export const rolesService = {
  /** GET /api/admin/roles — each role carries its permission codes and holder count. */
  getAllRoles(signal?: AbortSignal): Promise<ApiResponse<Role[]>> {
    return apiClient.get<ApiResponse<Role[]>>("/api/admin/roles", { signal });
  },

  /** POST /api/admin/roles */
  createRole(data: CreateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.post<ApiResponse<Role>>("/api/admin/roles", data);
  },

  /** PUT /api/admin/roles/{roleId} */
  updateRole(roleId: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.put<ApiResponse<Role>>(`/api/admin/roles/${roleId}`, data);
  },

  /** DELETE /api/admin/roles/{roleId} */
  deleteRole(roleId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`/api/admin/roles/${roleId}`);
  },

  /**
   * PUT /api/admin/roles/{roleId}/permissions — replaces the role's permissions wholesale.
   * The whole matrix saves in one call, so a failure leaves the role untouched rather than
   * half-updated.
   */
  setRolePermissions(roleId: string, permissionIds: string[]): Promise<ApiResponse<Role>> {
    return apiClient.put<ApiResponse<Role>>(`/api/admin/roles/${roleId}/permissions`, {
      permissionIds,
    });
  },

  /** GET /api/admin/roles/{roleId}/permissions */
  getRolePermissions(roleId: string, signal?: AbortSignal): Promise<ApiResponse<Permission[]>> {
    return apiClient.get<ApiResponse<Permission[]>>(
      `/api/admin/roles/${roleId}/permissions`,
      { signal }
    );
  },

  /** GET /api/admin/roles/{roleId}/users */
  getRoleHolders(roleId: string, signal?: AbortSignal): Promise<ApiResponse<RoleHolder[]>> {
    return apiClient.get<ApiResponse<RoleHolder[]>>(`/api/admin/roles/${roleId}/users`, {
      signal,
    });
  },

  /** GET /api/admin/permissions */
  getAllPermissions(signal?: AbortSignal): Promise<ApiResponse<Permission[]>> {
    return apiClient.get<ApiResponse<Permission[]>>("/api/admin/permissions", { signal });
  },

  /** POST /api/admin/permissions */
  createPermission(data: CreatePermissionRequest): Promise<ApiResponse<Permission>> {
    return apiClient.post<ApiResponse<Permission>>("/api/admin/permissions", data);
  },

  /** PUT /api/admin/permissions/{permissionId} — description only; codes are immutable. */
  updatePermission(
    permissionId: string,
    description: string
  ): Promise<ApiResponse<Permission>> {
    return apiClient.put<ApiResponse<Permission>>(
      `/api/admin/permissions/${permissionId}`,
      { description }
    );
  },

  /** DELETE /api/admin/permissions/{permissionId} */
  deletePermission(permissionId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<ApiResponse<null>>(`/api/admin/permissions/${permissionId}`);
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
