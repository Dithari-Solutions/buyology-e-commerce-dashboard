export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
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

// Permissions bundled per role — mirrors the backend seed data
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER_SUPPORT: [
    "review:read",
    "review:moderate",
    "review:reply:create",
    "review:reply:update",
    "review:reply:delete",
    "review:delete",
    "question:read",
    "question:moderate",
    "question:answer:create",
    "question:answer:update",
    "question:answer:toggle",
    "question:answer:delete",
    "question:delete",
  ],
  COURIER_ADMIN: ["courier:read", "courier:create", "courier:update"],
  // Marketing pages (promo codes, newsletter, banners, stories, games) are gated by the
  // ADMIN role server-side rather than fine-grained permissions, so no codes are listed.
  MARKETING: [],
  STORE_ADMIN: [
    "store:read",
    "store:update",
    "store:product:read",
    "store:product:assign",
    "store:product:update",
    "store:product:remove",
    "store:admin:read",
  ],
  SUPERADMIN: [
    "review:read",
    "review:moderate",
    "review:reply:create",
    "review:reply:update",
    "review:reply:delete",
    "review:delete",
    "question:read",
    "question:moderate",
    "question:answer:create",
    "question:answer:update",
    "question:answer:toggle",
    "question:answer:delete",
    "question:delete",
    "courier:read",
    "courier:create",
    "courier:update",
    "courier:delete",
    "store:read",
    "store:update",
    "store:product:read",
    "store:product:assign",
    "store:product:update",
    "store:product:remove",
    "store:admin:read",
    "store:admin:assign",
    "store:admin:update",
    "store:admin:remove",
  ],
};
