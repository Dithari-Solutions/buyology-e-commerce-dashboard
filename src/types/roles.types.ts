export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  /** Permission codes this role grants, straight from the database. */
  permissionCodes: string[];
  /** How many users hold this role. */
  userCount: number;
  /** SUPERADMIN — cannot be renamed, deleted, or have its permissions edited. */
  locked: boolean;
}

export interface RoleHolder {
  userId: string;
  authCredentialId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userType: string | null;
  status: string | null;
  assignedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface CreatePermissionRequest {
  code: string;
  description?: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  roleName: string;
  assignedBy: string;
  assignedAt: string;
}

export interface UserPermissionOverride {
  userId: string;
  permissionId: string;
  permissionCode: string;
  effect: "ALLOW" | "DENY";
  assignedBy: string;
  assignedAt: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  assignedBy?: string;
}

export interface AssignPermissionRequest {
  userId: string;
  permissionId: string;
  effect: "ALLOW" | "DENY";
  assignedBy?: string;
}

// A role's permissions live on `Role.permissionCodes`, served from the database. There is
// deliberately no hardcoded copy of the backend seed data here: roles are editable from the RBAC
// console, so any static mirror goes stale the first time someone changes one.
