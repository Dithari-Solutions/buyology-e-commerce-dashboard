import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";

/**
 * Operational health across the services an order or a signup depends on.
 *
 * Numbers come back as -1 when the backend could not compute them. That is deliberate and must
 * not be rendered as zero: a health page that shows a confident all-clear because a query failed
 * is the exact failure it exists to prevent.
 */
export const UNKNOWN = -1;

export interface SignupCluster {
  ip: string;
  accounts: number;
  first_seen: string;
  last_seen: string;
  devices: number;
  domains: string | null;
}

export interface ServiceHealth {
  verification: {
    guardedAttemptsToday: number;
    dailyCap: number;
    history: { day: string; attempts: number }[];
    caveat: string;
  };
  signupClusters: SignupCluster[];
  payments: {
    stuckInSweep: number;
    oldestStuckHours: number;
    webhooksLastHour: number;
    minutesSinceLastWebhook: number;
    hmacInvalid24h: number;
    unprocessedWebhooks: number;
  };
  integrations: {
    erpFailed24h: number;
    erpUnsyncedOver30m: number;
    quiqupFailed24h: number;
    oldestUndispatchedMinutes: number;
  };
  /**
   * Status codes the application has actually returned, from Micrometer.
   *
   * Cumulative since the JVM started — hence uptimeHours. A count with no window is not a rate,
   * and the ratios are what matter: 5xx as a share of traffic, and which endpoints produce them.
   * `available` is false before the app has served anything.
   */
  http: {
    available: boolean;
    note?: string;
    uptimeHours?: number;
    total?: number;
    status2xx?: number;
    status3xx?: number;
    status4xx?: number;
    status5xx?: number;
    serverErrorRatePercent?: number;
    unauthorized401?: number;
    forbidden403?: number;
    throttled429?: number;
    topServerErrors?: { uri: string; count: number }[];
    topUnauthorized?: { uri: string; count: number }[];
    caveat?: string;
  };
  /** Checkouts that started and never completed — distinct from payments we failed to record. */
  checkout: {
    pendingPaymentTotal: number;
    pendingPayment24h: number;
    oldestPendingHours: number;
    paid24h: number;
    failed24h: number;
  };
}

export const serviceHealthService = {
  get(signal?: AbortSignal): Promise<ApiResponse<ServiceHealth>> {
    return apiClient.get("/api/admin/service-health", { signal });
  },
};
