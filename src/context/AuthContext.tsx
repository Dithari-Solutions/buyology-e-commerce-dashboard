import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { authService } from "../api/services/auth.service";
import {
  registerRefreshFn,
  registerSessionExpiredHandler,
  setAccessToken,
} from "../api/client";
import type { SignInRequest } from "../types/auth.types";

interface AuthContextType {
  isAuthenticated: boolean;
  /** True while the app is doing the initial silent session restore on mount */
  isLoading: boolean;
  signIn: (data: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start true so ProtectedRoute shows a spinner instead of an instant redirect
  const [isLoading, setIsLoading] = useState(true);

  // ── Silent refresh (called on mount AND by the HttpClient interceptor) ─────
  //
  // The browser automatically sends the HttpOnly refresh_token cookie because
  // authService uses `credentials: "include"`. JavaScript never sees the cookie
  // value — only the new accessToken in the response body.
  const doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await authService.refresh();
      const { accessToken } = res.data;
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      return accessToken;
    } catch {
      setAccessToken(null);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  // ── Session-expired handler (called by HttpClient when refresh fails) ──────
  const handleSessionExpired = useCallback(() => {
    setAccessToken(null);
    setIsAuthenticated(false);
    navigate("/signin", { replace: true });
  }, [navigate]);

  // ── Register hooks with the HttpClient once on mount ─────────────────────
  useEffect(() => {
    registerRefreshFn(doRefresh);
    registerSessionExpiredHandler(handleSessionExpired);
  }, [doRefresh, handleSessionExpired]);

  // ── On app load: attempt to restore session via the HttpOnly cookie ───────
  //
  // If the user has a valid refresh_token cookie, doRefresh() will succeed and
  // restore their session silently (no redirect to /signin needed).
  // If not, isLoading will be set to false and ProtectedRoute will redirect.
  useEffect(() => {
    doRefresh().finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (credentials: SignInRequest) => {
      // The backend sets the HttpOnly refresh_token cookie in the response.
      // We only extract and store the accessToken from the JSON body.
      const res = await authService.signIn(credentials);
      setAccessToken(res.data.accessToken);
      setIsAuthenticated(true);
      navigate("/", { replace: true });
    },
    [navigate]
  );

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      // Tells the backend to invalidate the refresh token and clear the cookie
      await authService.logout();
    } finally {
      // Always clear local state, even if the logout request fails
      setAccessToken(null);
      setIsAuthenticated(false);
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
