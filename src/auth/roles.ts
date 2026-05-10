import { hasAnyRole, hasRole } from "../api/client";

export const ADMIN_ROLES = [
  "ADMIN",
  "SUPERADMIN",
  "CUSTOMER_SUPPORT",
  "COURIER",
] as const;

/** Has any role that grants admin-side dashboard access. */
export function isAdminUser(): boolean {
  return hasAnyRole(...ADMIN_ROLES);
}

/** SUPPLIER role with no admin-side role attached. */
export function isPureSupplier(): boolean {
  return hasRole("SUPPLIER") && !isAdminUser();
}

/** Where a freshly-authenticated user should land based on their roles. */
export function landingPathForCurrentUser(): string {
  return isPureSupplier() ? "/supplier/my-products" : "/";
}
