import { env } from "../config/env";
import { ApiError, ApiRequestError } from "./types/api.types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = Omit<RequestInit, "method" | "body">;

interface RequestWithBodyOptions extends RequestOptions {
  body?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level token store
//
// Lives outside React so the HttpClient singleton can read it synchronously on
// every request without being tied to the render cycle.
// ─────────────────────────────────────────────────────────────────────────────

let _accessToken: string | null = null;

/**
 * Called by AuthContext after a successful sign-in or token refresh.
 * Pass `null` to clear (on logout / session expiry).
 */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/**
 * Decodes the JWT payload (without verification) and returns the `sub` claim
 * as the user ID. Returns null if no token is present or decoding fails.
 */
export function getUserIdFromToken(): string | null {
  if (!_accessToken) return null;
  try {
    const payloadB64 = _accessToken.split(".")[1];
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

interface JwtPayload {
  sub?: string;
  uid?: string;
  aud?: string;
  roles?: string[];
  permissions?: string[];
}

function decodeJwtPayload(): JwtPayload | null {
  if (!_accessToken) return null;
  try {
    const payloadB64 = _accessToken.split(".")[1];
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns the current user's `users.id` (the `uid` claim).
 *
 * Distinct from {@link getUserIdFromToken}, which returns `sub` — the auth-credential id. Anything
 * comparing against a `userId` from an admin API (or sending one as a body field) needs this one.
 */
export function getAccountIdFromToken(): string | null {
  return decodeJwtPayload()?.uid ?? null;
}

/** Returns the role names assigned to the current user, e.g. ["ADMIN", "SUPPLIER"]. */
export function getRolesFromToken(): string[] {
  return decodeJwtPayload()?.roles ?? [];
}

/** Returns the permission codes granted to the current user. */
export function getPermissionsFromToken(): string[] {
  return decodeJwtPayload()?.permissions ?? [];
}

/** True if the user has the given role (case-insensitive). */
export function hasRole(role: string): boolean {
  const target = role.toUpperCase();
  return getRolesFromToken().some((r) => r.toUpperCase() === target);
}

/** True if the user has any of the given roles (case-insensitive). */
export function hasAnyRole(...roles: string[]): boolean {
  return roles.some((r) => hasRole(r));
}

/** True if the user has the given permission code, e.g. "supplier:product:read". */
export function hasPermission(code: string): boolean {
  return getPermissionsFromToken().includes(code);
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh & session-expiry hooks
//
// AuthContext registers these once on mount. This lets the HttpClient trigger
// a silent token refresh or a redirect to /signin without depending on React.
// ─────────────────────────────────────────────────────────────────────────────

let _refreshFn: (() => Promise<string | null>) | null = null;
let _onSessionExpired: (() => void) | null = null;

export function registerRefreshFn(fn: () => Promise<string | null>): void {
  _refreshFn = fn;
}

export function registerSessionExpiredHandler(fn: () => void): void {
  _onSessionExpired = fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Race-condition guard
//
// If N requests all receive 401 simultaneously, only ONE /auth/refresh call is
// made. The others enqueue a promise and are resolved after the single refresh
// completes, then each retries its original request automatically.
// ─────────────────────────────────────────────────────────────────────────────

let _isRefreshing = false;
const _refreshQueue: Array<(token: string | null) => void> = [];

async function runRefresh(): Promise<string | null> {
  if (_isRefreshing) {
    // Another request is already refreshing — wait for it to finish
    return new Promise<string | null>((resolve) => {
      _refreshQueue.push(resolve);
    });
  }

  _isRefreshing = true;
  try {
    const newToken = await _refreshFn!();
    setAccessToken(newToken);
    _refreshQueue.forEach((resolve) => resolve(newToken));
    return newToken;
  } catch {
    setAccessToken(null);
    _refreshQueue.forEach((resolve) => resolve(null));
    return null;
  } finally {
    _isRefreshing = false;
    _refreshQueue.length = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HttpClient
// ─────────────────────────────────────────────────────────────────────────────

class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl || !baseUrl.trim()) {
      throw new Error(
        "apiClient requires a non-empty baseUrl. Set env.apiBaseUrl (VITE_API_BASE_URL) to backend API URL."
      );
    }

    this.baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  private buildHeaders(extra?: HeadersInit, isFormData?: boolean): Headers {
    const headers = new Headers();

    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }

    // Identify this client to the backend so the JWT audience claim is set
    // to "dashboard" — required for SUPPLIER-role users to log in here.
    headers.set("X-Client-Type", "dashboard");

    // Attach the in-memory access token on every authenticated request
    if (_accessToken) {
      headers.set("Authorization", `Bearer ${_accessToken}`);
    }

    if (extra) {
      new Headers(extra).forEach((value, key) => {
        if (value === "undefined" || value === "null") {
          headers.delete(key);
        } else {
          headers.set(key, value);
        }
      });
    }

    return headers;
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    { body, headers: extraHeaders, ...rest }: RequestWithBodyOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const isFormData = body instanceof FormData;

    // Wrap fetch so we can call it again after a successful token refresh
    const executeFetch = () =>
      fetch(url, {
        method,
        headers: this.buildHeaders(extraHeaders, isFormData),
        // credentials: "include" is required so the browser automatically
        // sends the HttpOnly refresh_token cookie on cross-origin requests.
        // The backend MUST have CORS allowCredentials=true + explicit origin.
        credentials: "include",
        body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
        ...rest,
      });

    let response = await executeFetch();

    // ── 401 → silent refresh + retry ─────────────────────────────────────────
    if (response.status === 401 && _refreshFn) {
      const newToken = await runRefresh();

      if (newToken) {
        // Token refreshed — retry the original request (headers rebuild with new token)
        response = await executeFetch();
      } else {
        // Refresh failed → session is expired, redirect to login
        _onSessionExpired?.();
        throw new ApiRequestError({
          statusCode: 401,
          message: "Session expired. Please sign in again.",
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!response.ok) {
      let payload: ApiError;

      try {
        payload = (await response.json()) as ApiError;
      } catch {
        payload = {
          statusCode: response.status,
          message: response.statusText || "An unexpected error occurred.",
        };
      }

      throw new ApiRequestError(payload);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, { ...options, body });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, { ...options, body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, { ...options, body });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }
}

export const apiClient = new HttpClient(env.apiBaseUrl);
export const courierApiClient = new HttpClient(env.courierApiBaseUrl);
