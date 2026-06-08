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
import { landingPathForCurrentUser } from "../auth/roles";
import { IS_SUPPLIER_PORTAL } from "../config/portal";
import type { SignInData, SignInRequest } from "../types/auth.types";

/** A pending two-factor challenge captured during sign-in, consumed by the MFA pages. */
export interface PendingMfa {
  mfaToken: string;
  mode: "setup" | "verify";
}

interface AuthContextType {
  isAuthenticated: boolean;
  /** True while the app is doing the initial silent session restore on mount */
  isLoading: boolean;
  signIn: (data: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  /** Mark the session authenticated with a freshly issued access token (e.g. after
   *  supplier password setup) so guards see the user as logged in immediately. */
  applySession: (accessToken: string) => void;
  /** The active 2FA challenge, if sign-in returned one. Null otherwise. */
  pendingMfa: PendingMfa | null;
  /**
   * Inspect a sign-in/onboarding response. If it carries a 2FA challenge, stash
   * the ticket, navigate to the matching MFA page, and return true. Otherwise
   * return false so the caller can complete the login itself.
   */
  consumeAuthData: (data: SignInData) => boolean;
  /** Finish a 2FA flow: store the issued token and land the user in the app. */
  completeMfa: (accessToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start true so ProtectedRoute shows a spinner instead of an instant redirect
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null);

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

  // ── 2FA challenge handling ─────────────────────────────────────────────────
  // Privileged accounts (admin/supplier) don't get a session straight away — the
  // backend returns a challenge with a short-lived ticket. Route to the matching
  // MFA page and let it redeem the ticket.
  const consumeAuthData = useCallback(
    (data: SignInData): boolean => {
      if (data?.mfaSetupRequired && data.mfaToken) {
        setPendingMfa({ mfaToken: data.mfaToken, mode: "setup" });
        navigate("/mfa/setup", { replace: true });
        return true;
      }
      if (data?.mfaRequired && data.mfaToken) {
        setPendingMfa({ mfaToken: data.mfaToken, mode: "verify" });
        navigate("/mfa/verify", { replace: true });
        return true;
      }
      return false;
    },
    [navigate]
  );

  const completeMfa = useCallback(
    (accessToken: string) => {
      // NOTE: do NOT clear pendingMfa here. The MFA pages guard on it
      // (redirecting to /signin when absent); clearing it in the same render as
      // the navigation makes that guard fire and bounce the just-authenticated
      // user back to /signin. Let the route change unmount the page instead —
      // pendingMfa is reset on the next signIn / signOut.
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      navigate(landingPathForCurrentUser(), { replace: true });
    },
    [navigate]
  );

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (credentials: SignInRequest) => {
      // Drop any leftover challenge from a previous (abandoned) attempt.
      setPendingMfa(null);
      // The backend sets the HttpOnly refresh_token cookie in the response.
      // We only extract and store the accessToken from the JSON body.
      let res;
      if (IS_SUPPLIER_PORTAL) {
        // Supplier portal (supplier.* host): ONLY the supplier sign-in endpoint.
        // Admin accounts are not suppliers, so the backend refuses them here —
        // "suppliers only" is enforced at the API boundary, not just the UI.
        res = await authService.supplierSignIn(credentials);
      } else {
        // Admin portal: shared form. Admin endpoint first; if it refuses a
        // SUPPLIER account, retry the supplier endpoint.
        try {
          res = await authService.signIn(credentials);
        } catch (e) {
          const err = e as { statusCode?: number; message?: string };
          const isSupplierRedirect =
            err?.statusCode === 403 &&
            typeof err.message === "string" &&
            err.message.toLowerCase().includes("supplier");
          if (!isSupplierRedirect) throw e;
          res = await authService.supplierSignIn(credentials);
        }
      }
      // Privileged accounts are gated by 2FA — bail to the MFA flow if challenged.
      if (consumeAuthData(res.data)) return;
      setAccessToken(res.data.accessToken ?? null);
      setIsAuthenticated(true);
      navigate(landingPathForCurrentUser(), { replace: true });
    },
    [navigate, consumeAuthData]
  );

  // ── Apply an externally obtained session (e.g. supplier set-password) ──────
  const applySession = useCallback((accessToken: string) => {
    setAccessToken(accessToken);
    setIsAuthenticated(true);
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      // Tells the backend to invalidate the refresh token and clear the cookie
      await authService.logout();
    } finally {
      // Always clear local state, even if the logout request fails
      setAccessToken(null);
      setIsAuthenticated(false);
      setPendingMfa(null);
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
        applySession,
        pendingMfa,
        consumeAuthData,
        completeMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
