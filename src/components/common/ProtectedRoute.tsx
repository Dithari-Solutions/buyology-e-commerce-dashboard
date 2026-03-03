import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * Wraps all routes that require authentication.
 *
 * - While the initial session-restore is in progress (app just loaded, checking
 *   the HttpOnly cookie via /auth/refresh) we render a spinner to avoid a flash
 *   redirect to /signin for users who ARE authenticated.
 * - Once loading is done, authenticated users see the dashboard; everyone else
 *   is redirected to /signin.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-[#402F75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
}
