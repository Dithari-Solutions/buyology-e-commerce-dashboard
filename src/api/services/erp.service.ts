import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import { ApiRequestError } from "../types/api.types";

/**
 * Client for the backend ERPNext integration (com.buyology.ecommerce.erpnext).
 *
 * Testing stage: the backend reads the ERPNext Item list and relays it here — nothing is
 * persisted to our database. Goes through the normal apiClient (admin JWT, SUPERADMIN-gated).
 */

const BASE = "/api/admin/erp";

/** A product as projected from an ERPNext Item document. */
export interface ErpProduct {
  name: string;
  itemCode: string | null;
  itemName: string | null;
  description: string | null;
  itemGroup: string | null;
  brand: string | null;
  standardRate: number | null;
  stockUom: string | null;
  image: string | null;
  disabled: boolean | null;
}

export interface ErpConfig {
  enabled: boolean;
  baseUrl: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  syncOrders: boolean;
  submitDocuments: boolean;
  company: string | null;
  autoCreateCustomer: boolean;
  autoCreateItems: boolean;
  shippingAccountHead: string | null;
}

/** ERPNext sync state of one Buyology order. */
export interface ErpOrderSync {
  orderId: string;
  status: string | null;
  totalAmount: number | null;
  currency: string | null;
  paidAt: string | null;
  erpSalesOrder: string | null;
  erpSalesInvoice: string | null;
  erpSyncedAt: string | null;
  erpSyncError: string | null;
  salesOrderUrl: string | null;
  salesInvoiceUrl: string | null;
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

export const erpService = {
  getConfig: () => call<ErpConfig>(get<ErpConfig>("/config")),
  /** Fetch the first `limit` products live from ERPNext (default 10). No DB save. */
  getProducts: (limit = 10) => call<ErpProduct[]>(get<ErpProduct[]>(`/products?limit=${limit}`)),

  /** Recent orders with their ERPNext Sales Order / Sales Invoice sync state. */
  getOrders: (limit = 20) => call<ErpOrderSync[]>(get<ErpOrderSync[]>(`/orders?limit=${limit}`)),

  /** Push one order to ERPNext now. Idempotent — already-synced orders are not duplicated. */
  syncOrder: (orderId: string) =>
    call<{ outcome: string; order: ErpOrderSync | null }>(
      post<{ outcome: string; order: ErpOrderSync | null }>(
        `/orders/${encodeURIComponent(orderId)}/sync`
      )
    ),
};
