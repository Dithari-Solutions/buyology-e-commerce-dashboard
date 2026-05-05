import { apiClient } from "../client";
import type { ApiResponse } from "../types/api.types";
import type {
  OrderAdminResponse,
  OrderListResponse,
  OrderStatus,
} from "../../types/order.types";

const BASE = "/api/admin/orders";

export const ordersService = {
  // GET /api/admin/orders
  getAll(
    params: {
      page?: number;
      size?: number;
      status?: OrderStatus;
      storeId?: string;
      search?: string;
      sort?: string;
    } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<OrderListResponse>> {
    const { page = 0, size = 20, status, storeId, search, sort } = params;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) query.set("status", status);
    if (storeId) query.set("storeId", storeId);
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);

    return apiClient.get<ApiResponse<OrderListResponse>>(`${BASE}?${query}`, { signal });
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
