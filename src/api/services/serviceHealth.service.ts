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
}

export const serviceHealthService = {
  get(signal?: AbortSignal): Promise<ApiResponse<ServiceHealth>> {
    return apiClient.get("/api/admin/service-health", { signal });
  },
};
