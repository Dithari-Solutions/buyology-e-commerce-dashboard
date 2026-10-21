import { getCustomRolesFromToken, hasAnyRole, hasPermission, hasRole } from "../api/client";

// Every role that grants admin-side dashboard access. Keep in sync with the backend
// RoleDataInitializer. ("COURIER" is the courier-app role, kept so courier admins
// aren't locked out of the admin area.)
export const ADMIN_ROLES = [
  "ADMIN",
  "SUPERADMIN",
  "STORE_ADMIN",
  "CUSTOMER_SUPPORT",
  "COURIER_ADMIN",
  "MARKETING",
  "COURIER",
  "PROCUREMENT",
  "REPAIR",
] as const;

/** Has any role that grants admin-side dashboard access. */
export function isAdminUser(): boolean {
  return hasAnyRole(...ADMIN_ROLES) || getCustomRolesFromToken().length > 0;
}

/** Custom staff accounts are governed by permissions rather than legacy role-name gates. */
export function usesCustomRolePermissions(): boolean {
  return !isSuperAdmin() && getCustomRolesFromToken().length > 0;
}

/** Permission-sensitive controls for custom staff, preserving existing system-role behavior. */
export function canPerformPermission(permission: string): boolean {
  return !usesCustomRolePermissions() || hasPermission(permission);
}

/** SUPPLIER role with no admin-side role attached. */
export function isPureSupplier(): boolean {
  return hasRole("SUPPLIER") && !isAdminUser();
}

/** Highest-privilege admin role — may export revenue tables and view export history. */
export function isSuperAdmin(): boolean {
  return hasRole("SUPERADMIN");
}

/** Procurement role — prices/rejects B2B RFQ quotes in the Procurement section. */
export function isProcurement(): boolean {
  return hasRole("PROCUREMENT") || (usesCustomRolePermissions() && ["b2b:quote:read", "b2b:product-request:read", "sell:read"].some(hasPermission));
}

/** Repair role — triages customer device-repair requests in the Repair section. */
export function isRepair(): boolean {
  return hasRole("REPAIR") || (usesCustomRolePermissions() && hasPermission("repair:read"));
}

/** Marketing role — runs promos, banners, announcements and the giveaway. */
export function isMarketing(): boolean {
  return hasRole("MARKETING") || (usesCustomRolePermissions() && hasPermission("marketing:email:send"));
}

/** Customer-support role — answers support tickets in the Support section. */
export function isSupport(): boolean {
  return hasRole("CUSTOMER_SUPPORT") || (usesCustomRolePermissions() && hasPermission("support:read"));
}

/**
 * Whether the current user may see a nav entry restricted to `allowedRoles`.
 * SUPERADMIN sees everything; an undefined/empty list means "all admins".
 * Note: this only governs sidebar visibility — actual access is enforced server-side.
 */
export function canAccessRoles(allowedRoles?: string[]): boolean {
  if (isSuperAdmin()) return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return hasAnyRole(...allowedRoles);
}

/** Where a freshly-authenticated user should land based on their roles. */
export function landingPathForCurrentUser(): string {
  return isPureSupplier() ? "/supplier/my-products" : "/";
}
