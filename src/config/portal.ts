// Which portal this build is being served as, decided by hostname at runtime.
// The same static bundle is served on both admin.* and supplier.* — only the
// auth behaviour differs. `supplier.*` => supplier portal (suppliers only).
export type PortalMode = "admin" | "supplier";

export function getPortalMode(): PortalMode {
  if (typeof window === "undefined") return "admin";
  return window.location.hostname.startsWith("supplier.") ? "supplier" : "admin";
}

/** True when served on the supplier subdomain — restrict sign-in to suppliers. */
export const IS_SUPPLIER_PORTAL: boolean = getPortalMode() === "supplier";
