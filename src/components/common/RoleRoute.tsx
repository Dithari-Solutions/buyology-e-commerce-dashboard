import { Navigate, Outlet } from "react-router";
import { isPureSupplier } from "../../auth/roles";

type RoleArea = "admin" | "supplier";

/**
 * Guards a group of routes by role area.
 *
 * - mode="admin"    → blocks pure SUPPLIER users; redirects them to their portal.
 * - mode="supplier" → blocks non-SUPPLIER users; redirects them to admin home.
 *
 * Must be rendered inside <ProtectedRoute /> (so we already know the user is
 * authenticated and the access token has been parsed).
 */
export default function RoleRoute({ mode }: { mode: RoleArea }) {
  const supplier = isPureSupplier();

  if (mode === "admin" && supplier) {
    return <Navigate to="/supplier/my-products" replace />;
  }
  if (mode === "supplier" && !supplier) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
