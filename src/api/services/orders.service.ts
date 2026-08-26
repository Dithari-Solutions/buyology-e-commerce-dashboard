import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  OrderAdminResponse,
  OrderListResponse,
  OrderStatus,
} from "../../types/order.types";

const BASE = "/api/admin/orders";

/** What a payment re-check found at the gateway. */
export interface PaymentRecheckResult {
  /** True when the gateway confirmed payment and the order was settled. */
  settled: boolean;
  status: string | null;
  message: string;
}

export const ordersService = {
  // GET /api/admin/orders
  getAll(
    params: {
      page?: number;
      size?: number;
      status?: OrderStatus;
      storeId?: string;
      supplierId?: string;
      search?: string;
      sort?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<OrderListResponse>> {
    const { page = 0, size = 20, status, storeId, supplierId, search, sort } = params;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    if (storeId) query.set("storeId", storeId);
    if (supplierId) query.set("supplierId", supplierId);
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);

    return apiClient.get<ApiResponse<OrderListResponse>>(`${BASE}?${query}`, { signal });
  },

  // GET /api/supplier/orders — orders containing the current supplier's items
  getMine(
    params: { page?: number; size?: number; status?: OrderStatus } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<OrderListResponse>> {
    const { page = 0, size = 20, status } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) query.set("status", status);
    return apiClient.get<ApiResponse<OrderListResponse>>(`/api/supplier/orders?${query}`, { signal });
  },

  // GET /api/admin/orders/{id}/with-proof
  getByIdWithProof(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/with-proof`, { signal });
  },

  // GET /api/admin/orders/{id}
  getById(id: string, signal?: AbortSignal): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.get<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}`, { signal });
  },

  // PATCH /api/admin/orders/{id}/status
  updateStatus(
    id: string,
    body: { status: OrderStatus; notes?: string; cancellationReason?: string }
  ): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/status`, body);
  },

  // PATCH /api/admin/orders/{id}/courier  — assign a store courier profile
  assignCourier(id: string, courierProfileId: string): Promise<ApiResponse<OrderAdminResponse>> {
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`${BASE}/${id}/courier`, { courierProfileId });
  },

  // PATCH /api/supplier/orders/{id}/status  — supplier advances their own order
  supplierUpdateStatus(
    id: string,
    status: OrderStatus,
    notes?: string
  ): Promise<ApiResponse<OrderAdminResponse>> {
    const query = new URLSearchParams({ status });
    if (notes) query.set("notes", notes);
    return apiClient.patch<ApiResponse<OrderAdminResponse>>(`/api/supplier/orders/${id}/status?${query}`);
  },

  /**
   * POST /api/admin/payments/orders/{id}/recheck
   *
   * Asks Paymob what the order's outstanding payment really did, and settles the order if it
   * was paid. For the case where the gateway took the money but the webhook never landed, so
   * a paid order sits in "Awaiting payment" and no automatic path can rescue it.
   */
  recheckPayment(
    id: string,
    providerTransactionId?: string,
  ): Promise<ApiResponse<PaymentRecheckResult>> {
    // Supplied only when no webhook ever reached us, so we have no id of our own to ask about.
    const query = providerTransactionId
      ? `?providerTransactionId=${encodeURIComponent(providerTransactionId)}`
      : "";
    return apiClient.post<ApiResponse<PaymentRecheckResult>>(
      `/api/admin/payments/orders/${id}/recheck${query}`,
    );
  },

  // POST /api/admin/orders/{id}/proof/{type}  (multipart)
  uploadProof(
    id: string,
    type: "PICKUP" | "DROPOFF",
    file: File
  ): Promise<ApiResponse<OrderAdminResponse>> {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<ApiResponse<OrderAdminResponse>>(
      `${BASE}/${id}/proof/${type}`,
      form
    );
  },
};
