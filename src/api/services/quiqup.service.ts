import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import { ApiRequestError } from "../types/api.types";

/**
 * Client for the backend Quiqup STAGING test module (com.buyology.ecommerce.quiqup).
 *
 * Goes through the normal apiClient (prod backend, admin JWT, SUPERADMIN-gated). The
 * backend module only ever calls Quiqup STAGING and is decoupled from real orders, so
 * nothing here can affect production orders.
 */

const BASE = "/api/admin/quiqup";

/** Quiqup's response, relayed by the backend. */
export interface QuiqupResult {
  status: number;
  ok: boolean;
  body: unknown;
}

export interface QuiqupConfig {
  enabled: boolean;
  baseUrl: string;
  authMode: string;
  hasApiKey: boolean;
  apiKeyHeader: string;
  accountId: string | null;
  webhookSecretConfigured: boolean;
  webhookPath: string;
  paths: Record<string, string>;
}

export interface QuiqupVerify {
  authMode: string;
  ok: boolean;
  tokenPreview?: string | null;
  header?: string;
  expiresAt?: string;
}

export interface QuiqupEvent {
  id: string;
  at: string;
  eventType?: string | null;
  payload: unknown;
  headers?: unknown;
  hmacValid?: boolean | null;
  sourceIp?: string | null;
}

export interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

async function call<T>(p: Promise<ApiResponse<T>>): Promise<Envelope<T>> {
  try {
    const res = await p;
    return { ok: true, data: res.data };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      return { ok: false, error: e.message, status: e.statusCode };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const get = <T>(path: string) => apiClient.get<ApiResponse<T>>(`${BASE}${path}`);
const post = <T>(path: string, body?: unknown) => apiClient.post<ApiResponse<T>>(`${BASE}${path}`, body);
const put = <T>(path: string, body?: unknown) => apiClient.put<ApiResponse<T>>(`${BASE}${path}`, body);
const del = <T>(path: string) => apiClient.delete<ApiResponse<T>>(`${BASE}${path}`);

export const quiqupService = {
  getConfig: () => call<QuiqupConfig>(get<QuiqupConfig>("/config")),
  getSamples: () =>
    call<{ onDemand: unknown; ecommerce: unknown; quote: unknown }>(
      get<{ onDemand: unknown; ecommerce: unknown; quote: unknown }>("/samples")
    ),
  verify: () => call<QuiqupVerify>(post<QuiqupVerify>("/verify")),

  // Unified Quiqup /orders API
  createOrder: (order: unknown) => call<QuiqupResult>(post<QuiqupResult>("/orders", order)),
  getOrder: (id: string) => call<QuiqupResult>(get<QuiqupResult>(`/orders/${encodeURIComponent(id)}`)),
  markReady: (id: string) => call<QuiqupResult>(put<QuiqupResult>(`/orders/${encodeURIComponent(id)}/ready`)),
  getLabel: (id: string) => call<QuiqupResult>(get<QuiqupResult>(`/orders/${encodeURIComponent(id)}/label`)),
  cancelOrder: (id: string) => call<QuiqupResult>(post<QuiqupResult>("/orders/cancel", { id })),

  // Raw request tester
  raw: (method: string, path: string, body?: unknown) =>
    call<QuiqupResult>(post<QuiqupResult>("/raw", { method, path, body })),

  // Received webhooks
  getEvents: () => call<QuiqupEvent[]>(get<QuiqupEvent[]>("/events")),
  clearEvents: () => call<{ cleared: boolean }>(del<{ cleared: boolean }>("/events")),
};
