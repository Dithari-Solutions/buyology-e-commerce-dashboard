/**
 * Auth service — deliberately bypasses the main HttpClient so that:
 *   1. Refresh/logout calls never trigger another refresh on 401.
 *   2. `credentials: "include"` is always set (required for the browser to
 *      send/receive the HttpOnly `refresh_token` cookie automatically).
 *
 * HOW THE HttpOnly COOKIE WORKS:
 *   - On /auth/signin the Spring Boot backend sets `Set-Cookie: refresh_token=...;
 *     HttpOnly; Secure; SameSite=Strict` in the response header.
 *   - JavaScript can NEVER read this cookie (HttpOnly flag).
 *   - The browser attaches it automatically on every subsequent same-origin (or
 *     allowed cross-origin) request when `credentials: "include"` is used.
 *   - /auth/refresh reads it server-side and issues a new accessToken.
 *   - /auth/logout instructs the server to invalidate it and clear the cookie.
 */

import { env } from "../../config/env";
import { ApiError, ApiRequestError } from "../types/api.types";
import type { ApiResponse } from "../types/api.types";
import type { SignInData, SignInRequest, RefreshData } from "../../types/auth.types";

async function authFetch<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    // REQUIRED: tells the browser to send the HttpOnly refresh_token cookie
    // and accept Set-Cookie headers from the backend.
    // The backend MUST have CORS allowCredentials=true + explicit allowedOrigin.
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload: ApiError;
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      payload = { statusCode: response.status, message: response.statusText };
    }
    throw new ApiRequestError(payload);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authService = {
  /**
   * POST /auth/signin
   * Returns accessToken in body; backend sets HttpOnly refresh_token cookie.
   * Only store `accessToken` — never touch `refreshToken` from the body.
   */
  signIn: (data: SignInRequest) =>
    authFetch<ApiResponse<SignInData>>("POST", "/auth/signin", data),

  /**
   * POST /auth/refresh
   * Browser sends the HttpOnly cookie automatically (credentials: "include").
   * Returns a fresh accessToken.
   */
  refresh: () =>
    authFetch<ApiResponse<RefreshData>>("POST", "/auth/refresh"),

  /**
   * POST /auth/logout
   * Backend invalidates the refresh token and clears the HttpOnly cookie.
   */
  logout: () =>
    authFetch<void>("POST", "/auth/logout"),
};
