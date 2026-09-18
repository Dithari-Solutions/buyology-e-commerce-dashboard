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
 *
 * <p>Arming the renewal timer here, rather than at each call site, is deliberate: a session can be
 * established by ordinary sign-in, by finishing a 2FA challenge, by a supplier setting their first
 * password, or by a refresh, and only some of those responses carry an `expiresIn`. The token states
 * its own expiry in its `exp` claim, so reading it back from the token covers every path and cannot
 * drift from the lifetime the backend actually issued.
 */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
  if (token === null) {
    cancelProactiveRefresh();
  } else {
    scheduleProactiveRefreshFromToken();
  }
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
  /** Expiry, seconds since the epoch — what the renewal timer is scheduled against. */
  exp?: number;
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

/**
 * Why a refresh failed, which is the difference between "sign the admin out" and "try again".
 *
 * <p>Collapsing every failure into null is what made this dashboard lose sessions for no reason. A
 * refresh can fail because the token really is finished — and then the only honest answer is the
 * sign-in page — or because the network dropped a packet, the browser was offline for a second, the
 * gateway answered 502, or the platform-wide refresh throttle returned 429. Those say nothing at all
 * about whether the session is still valid, and treating them as "you are logged out" throws away a
 * perfectly good session, along with whatever the admin had typed into the product form.
 */
export type RefreshResult =
  | { status: "refreshed"; accessToken: string; expiresInSeconds: number }
  /** Could not reach a verdict. The session is probably fine; retry, do not sign out. */
  | { status: "transient" }
  /** The server looked at the token and refused it. This one is a real logout. */
  | { status: "expired" };

let _refreshFn: (() => Promise<RefreshResult>) | null = null;
let _onSessionExpired: (() => void) | null = null;

export function registerRefreshFn(fn: () => Promise<RefreshResult>): void {
  _refreshFn = fn;
}

export function registerSessionExpiredHandler(fn: () => void): void {
  _onSessionExpired = fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proactive refresh
//
// The old client only ever refreshed in reaction to a failed request. That is
// enough to keep working, but it means every single access-token expiry is met
// with a failure first — and each of those is a chance for the retry to go wrong
// and end the session. An admin who spends an afternoon adding products crosses
// that boundary all afternoon.
//
// So renew BEFORE it expires, on a timer, while nothing is at stake: if a
// proactive refresh fails transiently it is retried with nothing lost, because no
// real request was waiting on it.
//
// Timers alone are not enough. A laptop that sleeps, or a tab the browser
// throttles in the background, will not fire them on schedule — so the tab also
// re-checks whenever it becomes visible again, which is exactly the moment an
// admin comes back to a form they left open.
// ─────────────────────────────────────────────────────────────────────────────

/** Renew once this share of the token's life has passed, leaving room to retry. */
const REFRESH_AT_FRACTION = 0.75;
/** Never schedule closer than this, so a short token cannot spin the timer. */
const MIN_REFRESH_DELAY_MS = 30_000;
/** On regaining focus, renew if the token has less than this left. */
const FOCUS_REFRESH_MARGIN_MS = 120_000;

let _refreshTimer: ReturnType<typeof setTimeout> | null = null;
let _accessTokenExpiresAt: number | null = null;

function clearRefreshTimer(): void {
  if (_refreshTimer !== null) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

/**
 * Notes when the stored access token dies and arms the renewal timer against it.
 *
 * <p>The deadline comes from the token's own `exp` claim, so it follows whatever lifetime the
 * backend is configured to issue — no number here to fall out of step with `jwt`
 * `.access-token-validity-minutes`. A token with no readable expiry leaves the timer unarmed and
 * the client simply falls back to renewing in reaction to a failed request, as it always did.
 */
export function scheduleProactiveRefreshFromToken(): void {
  clearRefreshTimer();
  _accessTokenExpiresAt = null;

  const exp = decodeJwtPayload()?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return;

  const expiresAt = exp * 1000;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return;

  _accessTokenExpiresAt = expiresAt;
  const delay = Math.max(MIN_REFRESH_DELAY_MS, remainingMs * REFRESH_AT_FRACTION);
  _refreshTimer = setTimeout(() => {
    _refreshTimer = null;
    // Fire and forget: runRefresh re-arms on success and retries transient failures itself.
    void runRefresh();
  }, delay);
}

/** Forgets the schedule — on sign-out, or once the session is genuinely over. */
export function cancelProactiveRefresh(): void {
  clearRefreshTimer();
  _accessTokenExpiresAt = null;
}

/**
 * Renews now if the token is spent or nearly spent. Safe to call as often as you like — it is a
 * no-op while there is comfortable life left, and runRefresh is single-flight regardless.
 */
export async function refreshIfStale(): Promise<void> {
  if (!_refreshFn || _accessTokenExpiresAt === null) return;
  if (Date.now() < _accessTokenExpiresAt - FOCUS_REFRESH_MARGIN_MS) return;
  await runRefresh();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshIfStale();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Race-condition guard
//
// If N requests all receive 401 simultaneously, only ONE /auth/refresh call is
// made. The others enqueue a promise and are resolved after the single refresh
// completes, then each retries its original request automatically.
// ─────────────────────────────────────────────────────────────────────────────

let _isRefreshing = false;
const _refreshQueue: Array<(result: RefreshResult) => void> = [];

/** How many times a transient refresh failure is retried before giving up for now. */
const REFRESH_TRANSIENT_ATTEMPTS = 3;
/** Backoff between those attempts. Short — a real request may be waiting behind this. */
const REFRESH_RETRY_DELAYS_MS = [400, 1200];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs at most ONE /auth/refresh at a time, resolving every other caller with its result.
 *
 * <p>Exported because the boot-time restore in AuthContext has to come through here too. It used
 * to call doRefresh() directly, which put it OUTSIDE this guard — so an ordinary page reload fired
 * the boot refresh and, at the same moment, a refresh for every page request that 401'd on the
 * empty in-memory token. They all presented the SAME rotated-once-only cookie, the losers were
 * rejected, and a rejected refresh signs the admin out. That is the "refreshing the page logs me
 * out of the dashboard" report, and the fix belongs on both sides: the backend now tolerates a
 * token reused within seconds of its rotation, and this stops the dashboard firing the race at all.
 */
export async function runRefresh(): Promise<RefreshResult> {
  if (_isRefreshing) {
    // Another request is already refreshing — wait for it to finish
    return new Promise<RefreshResult>((resolve) => {
      _refreshQueue.push(resolve);
    });
  }

  _isRefreshing = true;
  try {
    const result = await attemptRefreshWithRetries();

    if (result.status === "refreshed") {
      // setAccessToken re-arms the renewal timer from the new token's own expiry.
      setAccessToken(result.accessToken);
    } else if (result.status === "expired") {
      // Genuinely over. Drop the token and stop renewing.
      setAccessToken(null);
      cancelProactiveRefresh();
    }
    // "transient": deliberately keep the existing token and the existing schedule. It may well
    // still be valid, and throwing it away here is precisely the bug — the next request, or the
    // next timer tick, gets another go.

    _refreshQueue.forEach((resolve) => resolve(result));
    return result;
  } finally {
    _isRefreshing = false;
    _refreshQueue.length = 0;
  }
}

/**
 * One refresh, retried while the failures are inconclusive.
 *
 * <p>An `expired` verdict is returned immediately and never retried: the server has looked at the
 * token and refused it, and asking again cannot change that answer — it would only delay the
 * sign-in page.
 */
async function attemptRefreshWithRetries(): Promise<RefreshResult> {
  let last: RefreshResult = { status: "transient" };

  for (let attempt = 0; attempt < REFRESH_TRANSIENT_ATTEMPTS; attempt++) {
    try {
      last = await _refreshFn!();
    } catch {
      // A throw out of the refresh call itself tells us nothing about the token.
      last = { status: "transient" };
    }

    if (last.status !== "transient") return last;

    const delay = REFRESH_RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) await sleep(delay);
  }

  return last;
}

/**
 * Whether this response means "your access token is no longer good", as opposed to "you are not
 * allowed to do that".
 *
 * <p>The distinction is not the status code. An expired, malformed or wrong-audience token does
 * NOT produce a 401: JwtAuthenticationFilter simply continues without setting an authentication,
 * and Spring Security's default entry point answers **403 with an empty body**. A real permission
 * denial is also a 403 — but GlobalExceptionHandler renders that one as JSON carrying "You do not
 * have permission to perform this action". The body is what tells them apart.
 *
 * <p>Only retrying 401 meant the dashboard never refreshed at all once a token aged out: every
 * call came back 403, nothing triggered a refresh, and the admin was left on a dashboard where
 * each panel failed until they signed in again.
 *
 * <p>The response is cloned, so the caller's body is still unread afterwards.
 */
async function isSessionLapsed(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  if (response.status !== 403) return false;
  try {
    return (await response.clone().text()).trim() === "";
  } catch {
    return false;
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

  /**
   * Sends a request with the auth, refresh-and-retry and error handling every call shares, and
   * returns the successful response unread — so JSON calls and file downloads read it their own way.
   */
  private async send(
    method: HttpMethod,
    endpoint: string,
    { body, headers: extraHeaders, ...rest }: RequestWithBodyOptions = {}
  ): Promise<Response> {
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

    // ── Session lapsed → silent refresh + retry ──────────────────────────────
    if ((await isSessionLapsed(response)) && _refreshFn) {
      const outcome = await runRefresh();

      if (outcome.status === "refreshed") {
        // Token refreshed — retry the original request (headers rebuild with new token)
        response = await executeFetch();
      } else if (outcome.status === "transient") {
        // We could not find out whether the session is still good. Report THIS request as failed
        // and leave the session alone: signing the admin out because a refresh call could not be
        // reached would discard a session that is very likely still valid, and with it whatever
        // they were part-way through entering. The next request retries the whole dance.
        throw new ApiRequestError({
          statusCode: 503,
          message: "Could not reach the server. Check your connection and try again.",
        });
      } else {
        // The server refused the refresh token itself → the session really is over.
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

    return response;
  }

  private async request<T>(method: HttpMethod, endpoint: string, options: RequestWithBodyOptions = {}): Promise<T> {
    const response = await this.send(method, endpoint, options);

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /** GET a file (an export) as a Blob, with the same auth and session handling as every other call. */
  async getBlob(endpoint: string, options?: RequestOptions): Promise<Blob> {
    const response = await this.send("GET", endpoint, options);
    return response.blob();
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
